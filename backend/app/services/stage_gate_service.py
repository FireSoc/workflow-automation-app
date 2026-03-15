"""Stage-gate logic: do not allow stage advancement unless gate conditions are satisfied."""

from sqlalchemy.orm import Session

from app.models.enums import CustomerType, TaskStatus
from app.models.onboarding_project import OnboardingProject
from app.services.workflow_service import check_stage_gate as _check_stage_gate


def check_stage_gate(
    db: Session, project: OnboardingProject, customer_type: CustomerType
) -> tuple[bool, str]:
    """
    Evaluate whether the current stage's required tasks are all complete.
    Returns (can_advance, reason_if_blocked).
    """
    return _check_stage_gate(db, project, customer_type)


def gate_conditions_met(project: OnboardingProject) -> tuple[bool, list[str]]:
    """
    Return (all_met, list of unmet condition descriptions) for current stage.
    Used for display and blocker detection.
    """
    stage_tasks = [t for t in project.tasks if t.stage == project.current_stage]
    required = [t for t in stage_tasks if t.required_for_stage_completion]
    unmet: list[str] = []
    for task in required:
        if task.is_customer_required and task.status != TaskStatus.COMPLETED:
            unmet.append(f"Customer-required: {task.title}")
        elif task.requires_setup_data and task.status != TaskStatus.COMPLETED:
            unmet.append(f"Needs setup data: {task.title}")
        elif task.status != TaskStatus.COMPLETED:
            unmet.append(f"Required: {task.title} ({task.status.value})")
    return (len(unmet) == 0, unmet)
