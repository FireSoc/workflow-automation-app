"""Onboarding playbooks API."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.onboarding_playbook import OnboardingPlaybook
from app.schemas.playbook import PlaybookRead

router = APIRouter(prefix="/playbooks", tags=["Playbooks"])


@router.get("", response_model=list[PlaybookRead])
def list_playbooks(
    skip: int = 0, limit: int = 50, db: Session = Depends(get_db)
) -> list[OnboardingPlaybook]:
    """List onboarding playbooks."""
    return db.query(OnboardingPlaybook).offset(skip).limit(limit).all()


@router.get("/{playbook_id}", response_model=PlaybookRead)
def get_playbook(playbook_id: int, db: Session = Depends(get_db)) -> OnboardingPlaybook:
    """Get playbook by id."""
    playbook = db.query(OnboardingPlaybook).filter(OnboardingPlaybook.id == playbook_id).first()
    if not playbook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Playbook not found."
        )
    return playbook
