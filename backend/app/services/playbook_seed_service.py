"""Internal playbook creation for seed scripts only. Not exposed via API."""

from sqlalchemy.orm import Session

from app.models.onboarding_playbook import OnboardingPlaybook
from app.schemas.playbook import PlaybookCreate


def create_playbook_from_payload(
    db: Session, payload: PlaybookCreate
) -> OnboardingPlaybook:
    """
    Create and persist an OnboardingPlaybook from a validated PlaybookCreate payload.
    Used only by the seed script; playbooks are not created via the public API.
    """
    playbook = OnboardingPlaybook(
        name=payload.name,
        segment=payload.segment,
        supported_products=payload.supported_products,
        default_stages=payload.default_stages,
        default_tasks=[t.model_dump() for t in payload.default_tasks],
        branching_rules=payload.branching_rules,
        duration_rules=payload.duration_rules,
    )
    db.add(playbook)
    db.commit()
    db.refresh(playbook)
    return playbook
