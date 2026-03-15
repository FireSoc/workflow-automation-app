"""Customer-facing portal: limited project view (no internal risk)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_db
from app.models.enums import STAGE_ORDER
from app.models.onboarding_project import OnboardingProject
from app.schemas.project import CustomerPortalProjectView
from app.schemas.task import TaskRead

router = APIRouter(prefix="/customer-portal", tags=["Customer Portal"])


@router.get("/projects/{project_id}", response_model=CustomerPortalProjectView)
def get_customer_portal_project(
    project_id: int, db: Session = Depends(get_db)
) -> CustomerPortalProjectView:
    """
    Customer-facing project view: current stage, progress, tasks, next steps, milestones.
    Does not expose risk_score, risk_signals, internal recommendations, or health_summary.
    """
    project = (
        db.query(OnboardingProject)
        .options(
            selectinload(OnboardingProject.tasks),
            selectinload(OnboardingProject.customer),
        )
        .filter(OnboardingProject.id == project_id)
        .first()
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found."
        )

    customer = project.customer
    company_name = customer.company_name if customer else f"Customer #{project.customer_id}"

    # All tasks for progress; customer can see their tasks and due dates
    tasks = [TaskRead.model_validate(t) for t in project.tasks]
    stage_tasks = [t for t in project.tasks if t.stage == project.current_stage]
    incomplete = [t for t in stage_tasks if t.status.value not in ("completed",)]
    next_steps = (
        f"Complete: {', '.join(t.title for t in incomplete[:3])}"
        if incomplete
        else "Current stage complete; next stage will begin shortly."
    )
    milestones = [s.value.replace("_", " ").title() for s in STAGE_ORDER]

    return CustomerPortalProjectView(
        id=project.id,
        company_name=company_name,
        current_stage=project.current_stage,
        status=project.status,
        target_go_live_date=project.target_go_live_date,
        projected_go_live_date=project.projected_go_live_date,
        kickoff_date=project.kickoff_date,
        tasks=tasks,
        next_steps=next_steps,
        milestones=milestones,
    )