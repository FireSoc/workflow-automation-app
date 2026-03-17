"""Internal playbook creation for seed scripts and startup seeding. Not exposed via API."""

from sqlalchemy.orm import Session

from app.data.playbook_seed_data import PLAYBOOKS
from app.models.onboarding_playbook import OnboardingPlaybook
from app.schemas.playbook import PlaybookCreate


def ensure_playbooks_seeded(db: Session) -> None:
    """
    Create each default playbook by name only if it does not already exist.
    Idempotent; safe to call on every backend startup.
    """
    for payload in PLAYBOOKS:
        existing = (
            db.query(OnboardingPlaybook)
            .filter(OnboardingPlaybook.name == payload.name)
            .first()
        )
        if existing:
            continue
        create_playbook_from_payload(db, payload)


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
