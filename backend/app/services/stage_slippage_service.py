"""Detect stage slippage: stage taking longer than playbook benchmark."""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.enums import OnboardingStage
from app.models.onboarding_project import OnboardingProject
from app.services.event_service import log_event
from app.models.enums import EventType
from app.models.risk_signal import RiskSignal


def get_stage_start_date(project: OnboardingProject) -> datetime | None:
    """Approximate when current stage started (project created or kickoff for first stage)."""
    if project.current_stage == OnboardingStage.KICKOFF:
        return project.kickoff_date or project.created_at
    # For other stages we don't have per-stage started_at; use project.updated_at as proxy
    # or we could add stage_entered_at to project. For now use created_at as lower bound.
    return project.updated_at or project.created_at


def detect_stage_slippage(
    db: Session,
    project: OnboardingProject,
    expected_stage_days: int | None = None,
    duration_rules: dict | None = None,
) -> tuple[bool, str | None]:
    """
    Check if current stage has exceeded expected duration.
    expected_stage_days can be passed or read from duration_rules (key = current_stage.value).
    Returns (is_slipping, reason).
    """
    if project.status.value == "completed":
        return False, None

    stage_start = get_stage_start_date(project)
    if not stage_start:
        return False, None
    if stage_start.tzinfo is None:
        stage_start = stage_start.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    days_in_stage = (now - stage_start).days

    expected_days = expected_stage_days
    if expected_days is None and duration_rules and isinstance(duration_rules, dict):
        stage_val = project.current_stage.value
        expected_days = duration_rules.get(stage_val)
    if expected_days is None:
        expected_days = 14  # default

    if days_in_stage > expected_days:
        reason = (
            f"Stage '{project.current_stage.value}' has exceeded expected duration "
            f"({days_in_stage} days vs {expected_days} days)."
        )
        log_event(
            db,
            project_id=project.id,
            event_type=EventType.STAGE_DELAYED,
            message=reason,
        )
        sig = RiskSignal(
            project_id=project.id,
            signal_type="stage_slippage",
            description=reason,
            severity="medium",
        )
        db.add(sig)
        db.flush()
        return True, reason
    return False, None
