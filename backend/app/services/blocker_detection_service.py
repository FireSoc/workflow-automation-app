"""Detect blockers: unresolved dependency, missing customer input, security review pending, etc."""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.enums import TaskStatus
from app.models.onboarding_project import OnboardingProject
from app.models.risk_signal import RiskSignal
from app.models.task import Task
from app.services.event_service import log_event
from app.models.enums import EventType


def _task_is_blocked_by_dependency(
    task: Task, all_tasks: list[Task]
) -> tuple[bool, str | None]:
    """True if task has dependency_ids and any dependency is not completed."""
    dep_ids = task.dependency_ids or []
    if not dep_ids:
        return False, None
    task_map = {t.id: t for t in all_tasks}
    for tid in dep_ids:
        dep = task_map.get(tid)
        if dep and dep.status != TaskStatus.COMPLETED:
            return True, f"Blocked by task: {dep.title}"
    return False, None


def detect_blockers(db: Session, project: OnboardingProject) -> list[tuple[Task, str]]:
    """
    Detect blockers on project tasks. Returns list of (task, reason).
    Updates task.blocker_flag and task.blocker_reason; creates BLOCKER_DETECTED events and risk signals.
    """
    now = datetime.now(timezone.utc)
    all_tasks = project.tasks
    blocked: list[tuple[Task, str]] = []

    for task in all_tasks:
        if task.status == TaskStatus.COMPLETED:
            if task.blocker_flag:
                task.blocker_flag = False
                task.blocker_reason = None
            continue

        reason: str | None = None

        # Unresolved dependency
        is_dep, dep_reason = _task_is_blocked_by_dependency(task, all_tasks)
        if is_dep and dep_reason:
            reason = dep_reason

        # Customer-required task not done
        if task.is_customer_required and task.status != TaskStatus.COMPLETED:
            reason = "Customer has not submitted required info"

        # Requires setup data not submitted
        if task.requires_setup_data and task.status != TaskStatus.COMPLETED:
            reason = "Setup data not yet submitted"

        if reason:
            blocked.append((task, reason))
            if not task.blocker_flag or task.blocker_reason != reason:
                task.blocker_flag = True
                task.blocker_reason = reason
                log_event(
                    db,
                    project_id=project.id,
                    task_id=task.id,
                    event_type=EventType.BLOCKER_DETECTED,
                    message=f"Blocker: {task.title} — {reason}",
                )
                # Persist risk signal for explainable risk
                sig = RiskSignal(
                    project_id=project.id,
                    signal_type="blocked_dependency",
                    description=reason,
                    severity="high",
                )
                db.add(sig)
        else:
            if task.blocker_flag:
                task.blocker_flag = False
                task.blocker_reason = None

    db.flush()
    return blocked


def run_blocker_detection(db: Session, project: OnboardingProject) -> int:
    """
    Run blocker detection and persist. Returns count of tasks currently blocked.
    """
    blocked = detect_blockers(db, project)
    db.commit()
    return len(blocked)
