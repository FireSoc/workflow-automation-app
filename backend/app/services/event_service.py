"""Central event logging for onboarding project audit trail."""

from sqlalchemy.orm import Session

from app.models.enums import EventType
from app.models.onboarding_event import OnboardingEvent


def log_event(
    db: Session,
    *,
    project_id: int,
    event_type: EventType,
    message: str,
    task_id: int | None = None,
) -> OnboardingEvent:
    """Persist an OnboardingEvent. Callers must db.commit() after their unit of work."""
    event = OnboardingEvent(
        project_id=project_id,
        task_id=task_id,
        event_type=event_type,
        message=message,
    )
    db.add(event)
    return event
