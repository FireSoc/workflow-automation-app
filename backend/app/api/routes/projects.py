from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_db
from app.models.customer import Customer
from app.models.onboarding_project import OnboardingProject
from app.models.recommendation import Recommendation
from app.schemas.project import (
    OverdueCheckResponse,
    ProjectCreate,
    ProjectDetail,
    ProjectRead,
    ProjectSummaryResponse,
    RiskCheckResponse,
    RiskRead,
)
from app.schemas.ai import RiskSummaryResponse
from app.schemas.task import TaskRead
from app.schemas.onboarding_event import OnboardingEventRead
from app.schemas.recommendation import RecommendationRead
from app.services.reminder_service import check_overdue_tasks
from app.services.risk_service import apply_risk_check, recalculate_risk
from app.services.risk_scoring_service import compute_risk
from app.services.summary_service import build_summary
from app.services.workflow_service import advance_stage, create_project
from app.services.ai_service import generate_project_risk_summary

router = APIRouter(prefix="/projects", tags=["Projects"])


def _get_project_or_404(db: Session, project_id: int) -> OnboardingProject:
    project = (
        db.query(OnboardingProject)
        .options(
            selectinload(OnboardingProject.tasks),
            selectinload(OnboardingProject.events),
            selectinload(OnboardingProject.customer),
            selectinload(OnboardingProject.risk_signals),
            selectinload(OnboardingProject.recommendations),
        )
        .filter(OnboardingProject.id == project_id)
        .first()
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found."
        )
    return project


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_onboarding_project(
    payload: ProjectCreate, db: Session = Depends(get_db)
) -> OnboardingProject:
    customer = db.query(Customer).filter(Customer.id == payload.customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer {payload.customer_id} not found.",
        )
    return create_project(db, customer, name=payload.name, notes=payload.notes)


@router.get("", response_model=list[ProjectRead])
def list_projects(
    skip: int = 0, limit: int = 50, db: Session = Depends(get_db)
) -> list[OnboardingProject]:
    return db.query(OnboardingProject).offset(skip).limit(limit).all()


@router.get("/{project_id}", response_model=ProjectDetail)
def get_project(project_id: int, db: Session = Depends(get_db)) -> OnboardingProject:
    return _get_project_or_404(db, project_id)


@router.get("/{project_id}/tasks", response_model=list[TaskRead])
def list_project_tasks(project_id: int, db: Session = Depends(get_db)):
    project = _get_project_or_404(db, project_id)
    return project.tasks


@router.get("/{project_id}/events", response_model=list[OnboardingEventRead])
def list_project_events(project_id: int, db: Session = Depends(get_db)):
    project = _get_project_or_404(db, project_id)
    return sorted(project.events, key=lambda e: e.created_at)


@router.get("/{project_id}/recommendations", response_model=list[RecommendationRead])
def list_project_recommendations(project_id: int, db: Session = Depends(get_db)):
    project = _get_project_or_404(db, project_id)
    return [r for r in project.recommendations if not r.dismissed]


@router.post("/{project_id}/recommendations/{recommendation_id}/dismiss", response_model=RecommendationRead)
def dismiss_recommendation(
    project_id: int, recommendation_id: int, db: Session = Depends(get_db)
):
    project = _get_project_or_404(db, project_id)
    rec = db.query(Recommendation).filter(
        Recommendation.id == recommendation_id,
        Recommendation.project_id == project_id,
    ).first()
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found."
        )
    rec.dismissed = True
    db.commit()
    db.refresh(rec)
    return rec


@router.post("/{project_id}/check-overdue", response_model=OverdueCheckResponse)
def check_overdue(project_id: int, db: Session = Depends(get_db)) -> OverdueCheckResponse:
    project = _get_project_or_404(db, project_id)
    overdue_count, reminder_count = check_overdue_tasks(db, project)
    return OverdueCheckResponse(
        overdue_count=overdue_count,
        reminder_events_created=reminder_count,
        message=(
            f"{overdue_count} overdue task(s) found. "
            f"{reminder_count} reminder event(s) created."
            if overdue_count
            else "No overdue tasks found."
        ),
    )


@router.get("/{project_id}/risk", response_model=RiskRead)
def get_project_risk(project_id: int, db: Session = Depends(get_db)) -> RiskRead:
    project = _get_project_or_404(db, project_id)
    score, level, explanations = compute_risk(db, project)
    return RiskRead(
        risk_score=score,
        risk_level=level,
        risk_flag=project.risk_flag,
        explanations=explanations,
    )


@router.post("/{project_id}/risk/recalculate", response_model=RiskRead)
def recalculate_project_risk(project_id: int, db: Session = Depends(get_db)) -> RiskRead:
    project = _get_project_or_404(db, project_id)
    score, level, explanations = recalculate_risk(db, project)
    return RiskRead(
        risk_score=score,
        risk_level=level,
        risk_flag=project.risk_flag,
        explanations=explanations,
    )


@router.get("/{project_id}/summary", response_model=ProjectSummaryResponse)
def get_project_summary(project_id: int, db: Session = Depends(get_db)) -> ProjectSummaryResponse:
    project = _get_project_or_404(db, project_id)
    return build_summary(project)


@router.get("/{project_id}/risk/ai-summary", response_model=RiskSummaryResponse)
def get_project_risk_ai_summary(
    project_id: int, db: Session = Depends(get_db)
) -> RiskSummaryResponse:
    """
    AI-generated short summary for ops from project risk and summary.
    Always returns 200; uses fallback text if LLM is unavailable.
    """
    project = _get_project_or_404(db, project_id)
    score, level, explanations = compute_risk(db, project)
    risk = RiskRead(
        risk_score=score,
        risk_level=level,
        risk_flag=project.risk_flag,
        explanations=explanations,
    )
    summary = build_summary(project)
    risk_summary = generate_project_risk_summary(
        risk, summary, project_id=project_id
    )
    return RiskSummaryResponse(risk_summary=risk_summary)


@router.post("/{project_id}/advance-stage", response_model=dict)
def advance_project_stage(project_id: int, db: Session = Depends(get_db)) -> dict:
    project = _get_project_or_404(db, project_id)
    customer = project.customer
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found.")
    advanced, new_stage, project_completed = advance_stage(db, project, customer.customer_type)
    return {
        "advanced": advanced,
        "new_stage": new_stage.value if new_stage else None,
        "project_completed": project_completed,
        "message": (
            "Project completed."
            if project_completed
            else f"Advanced to {new_stage.value}." if advanced
            else "Stage gate not met; cannot advance.",
        ),
    }


@router.post("/{project_id}/check-risk", response_model=RiskCheckResponse)
def check_risk(project_id: int, db: Session = Depends(get_db)) -> RiskCheckResponse:
    project = _get_project_or_404(db, project_id)
    risk_flag, was_already_flagged, reason = apply_risk_check(db, project)
    return RiskCheckResponse(
        risk_flag=risk_flag,
        was_already_flagged=was_already_flagged,
        reason=reason,
        message=(
            "Project flagged as at-risk."
            if risk_flag and not was_already_flagged
            else "Risk flag cleared."
            if not risk_flag and was_already_flagged
            else "Project is at-risk (flag was already set)."
            if risk_flag
            else "Project is not at risk."
        ),
    )
