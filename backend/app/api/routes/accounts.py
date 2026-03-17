"""Onboarding accounts (customer accounts) API."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.auth import get_current_user
from app.models.customer import Customer
from app.schemas.customer import CustomerRead

router = APIRouter(prefix="/accounts", tags=["Accounts"])


@router.get("", response_model=list[CustomerRead])
def list_accounts(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: uuid.UUID = Depends(get_current_user),
) -> list[Customer]:
    """List customer accounts for the current user."""
    return (
        db.query(Customer)
        .filter(Customer.owner_id == current_user)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{account_id}", response_model=CustomerRead)
def get_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: uuid.UUID = Depends(get_current_user),
) -> Customer:
    """Get customer account by id (must belong to current user)."""
    customer = (
        db.query(Customer)
        .filter(Customer.id == account_id, Customer.owner_id == current_user)
        .first()
    )
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Account not found."
        )
    return customer
