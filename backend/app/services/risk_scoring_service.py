"""Deterministic, rules-based risk scoring with explainable reasons."""

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.enums import ProjectStatus, RiskLevel, TaskStatus
from app.models.onboarding_project import OnboardingProject
from app.models.risk_signal import RiskSignal


def _clear_old_risk_factor_signals(db: Session, project_id: int) -> None:
    """Remove only risk_factor signals so blocker/slippage signals are preserved."""
    db.query(RiskSignal).filter(
        RiskSignal.project_id == project_id,
        RiskSignal.signal_type == "risk_factor",
    ).delete()
    db.flush()


def compute_risk(
    db: Session, project: OnboardingProject
) -> tuple[int, RiskLevel, list[str]]:
    """
    Compute risk score (0-100), level (low/medium/high), and list of explanations.
    Does not persist; call persist_risk to save.
    """
    explanations: list[str] = []
    score = 0

    if project.status == ProjectStatus.COMPLETED:
        return 0, RiskLevel.LOW, []

    now = datetime.now(timezone.utc)
    stage_tasks = [t for t in project.tasks if t.stage == project.current_stage]
    required = [t for t in stage_tasks if t.required_for_stage_completion]
    all_overdue = [t for t in project.tasks if t.status == TaskStatus.OVERDUE]
    overdue_required = [t for t in required if t.status == TaskStatus.OVERDUE]
    blocked_tasks = [t for t in project.tasks if getattr(t, "blocker_flag", False)]

    # Overdue task count (weighted)
    if overdue_required:
        score += min(30, len(overdue_required) * 15)
        for t in overdue_required[:3]:
            days = 0
            if t.due_date:
                d = t.due_date.replace(tzinfo=timezone.utc) if t.due_date.tzinfo is None else t.due_date
                days = (now - d).days
            explanations.append(f"'{t.title}' overdue by {days} day(s)")
    if all_overdue and len(explanations) == 0:
        explanations.append(f"{len(all_overdue)} task(s) overdue")

    # Blocker severity
    if blocked_tasks:
        score += min(25, len(blocked_tasks) * 10)
        for t in blocked_tasks[:2]:
            reason = getattr(t, "blocker_reason", None) or "Blocked"
            explanations.append(f"Blocked: {t.title} — {reason}")

    # Inactivity
    project_updated = project.updated_at
    if project_updated.tzinfo is None:
        project_updated = project_updated.replace(tzinfo=timezone.utc)
    inactive_days = (now - project_updated).days
    if inactive_days >= settings.risk_stalled_threshold_days:
        score += 20
        explanations.append(f"No activity in {inactive_days} days")

    # Go-live proximity with critical work incomplete
    target = project.target_go_live_date
    if target and project.status != ProjectStatus.COMPLETED:
        target = target.replace(tzinfo=timezone.utc) if target.tzinfo is None else target
        days_to_go = (target - now).days
        if days_to_go <= 14 and (overdue_required or blocked_tasks):
            score += min(25, 30 - days_to_go)
            explanations.append(f"Go-live in {days_to_go} days with critical work incomplete")

    score = min(100, score)

    if score >= 60:
        level = RiskLevel.HIGH
    elif score >= 30:
        level = RiskLevel.MEDIUM
    else:
        level = RiskLevel.LOW

    return score, level, explanations


def persist_risk(
    db: Session,
    project: OnboardingProject,
    score: int,
    level: RiskLevel,
    explanations: list[str],
) -> None:
    """Persist risk score, level, health summary, and risk signals."""
    _clear_old_risk_factor_signals(db, project.id)
    for desc in explanations:
        sig = RiskSignal(
            project_id=project.id,
            signal_type="risk_factor",
            description=desc,
            severity=level.value,
        )
        db.add(sig)
    project.risk_score = score
    project.risk_level = level
    project.risk_flag = score >= 30
    if score >= 30:
        project.status = ProjectStatus.AT_RISK
    project.health_summary = "; ".join(explanations) if explanations else None
    db.flush()
