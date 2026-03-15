"""Risk evaluation: deterministic scoring and explainable flags."""

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.enums import EventType, ProjectStatus, RiskLevel, TaskStatus
from app.models.onboarding_project import OnboardingProject
from app.services.event_service import log_event
from app.services.risk_scoring_service import compute_risk, persist_risk


def evaluate_risk(
    db: Session, project: OnboardingProject
) -> tuple[bool, str | None]:
    """
    Evaluate whether the project should be flagged as at-risk (legacy boolean check).
    Returns (should_be_at_risk, reason).
    """
    if project.status == ProjectStatus.COMPLETED:
        return False, None

    now = datetime.now(timezone.utc)
    overdue_threshold = timedelta(days=settings.risk_overdue_threshold_days)
    stalled_threshold = timedelta(days=settings.risk_stalled_threshold_days)
    stage_tasks = [t for t in project.tasks if t.stage == project.current_stage]
    required_tasks = [t for t in stage_tasks if t.required_for_stage_completion]

    for task in required_tasks:
        if (
            task.status == TaskStatus.OVERDUE
            and task.due_date is not None
            and (now - task.due_date) > overdue_threshold
        ):
            return (
                True,
                f"Required task '{task.title}' has been overdue for more than "
                f"{settings.risk_overdue_threshold_days} day(s).",
            )

    project_updated = project.updated_at
    if project_updated.tzinfo is None:
        project_updated = project_updated.replace(tzinfo=timezone.utc)
    if (now - project_updated) > stalled_threshold:
        return (
            True,
            f"Project has had no activity for more than "
            f"{settings.risk_stalled_threshold_days} day(s).",
        )

    overdue_required = [t for t in required_tasks if t.status == TaskStatus.OVERDUE]
    if len(overdue_required) >= settings.risk_required_overdue_count:
        return (
            True,
            f"{len(overdue_required)} required task(s) in the current stage are overdue.",
        )

    return False, None


def apply_risk_check(
    db: Session, project: OnboardingProject
) -> tuple[bool, bool, str | None]:
    """
    Run risk evaluation and persist. Also computes score/level/explanations and persists.
    Returns (risk_flag, was_already_flagged, reason).
    """
    score, level, explanations = compute_risk(db, project)
    was_already_flagged = project.risk_flag
    persist_risk(db, project, score, level, explanations)

    if score >= 30 and not was_already_flagged:
        log_event(
            db,
            project_id=project.id,
            event_type=EventType.RISK_FLAG_ADDED,
            message=f"Project flagged as at-risk. Score={score}. {'; '.join(explanations[:2])}",
        )
    elif score < 30 and was_already_flagged:
        log_event(
            db,
            project_id=project.id,
            event_type=EventType.RISK_FLAG_CLEARED,
            message="Risk flag cleared. Project conditions have improved.",
        )

    db.commit()
    db.refresh(project)
    reason = explanations[0] if explanations else None
    return project.risk_flag, was_already_flagged, reason


def recalculate_risk(
    db: Session, project: OnboardingProject
) -> tuple[int, RiskLevel, list[str]]:
    """
    Full recalc: compute risk, persist score/signals, run blocker detection, generate
    recommendations, set next_best_action. Returns (score, level, explanations).
    """
    from app.services.blocker_detection_service import detect_blockers
    from app.services.recommendation_service import generate_recommendations, get_next_best_action

    detect_blockers(db, project)
    db.flush()

    score, level, explanations = compute_risk(db, project)
    persist_risk(db, project, score, level, explanations)
    generate_recommendations(db, project)
    db.refresh(project)
    project.next_best_action = get_next_best_action(project)
    db.commit()
    db.refresh(project)
    return score, level, explanations
