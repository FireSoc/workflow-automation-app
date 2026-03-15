"""Onboarding accounts (customer accounts) API."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.customer import Customer
from app.schemas.customer import CustomerRead

router = APIRouter(prefix="/accounts", tags=["Accounts"])


@router.get("", response_model=list[CustomerRead])
def list_accounts(
    skip: int = 0, limit: int = 50, db: Session = Depends(get_db)
) -> list[Customer]:
    """List customer accounts (for onboarding ops)."""
    return db.query(Customer).offset(skip).limit(limit).all()


@router.get("/{account_id}", response_model=CustomerRead)
def get_account(account_id: int, db: Session = Depends(get_db)) -> Customer:
    """Get customer account by id."""
    customer = db.query(Customer).filter(Customer.id == account_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Account not found."
        )
    return customer
