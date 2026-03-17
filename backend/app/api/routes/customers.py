import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.auth import get_current_user
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerRead

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.post("", response_model=CustomerRead, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: uuid.UUID = Depends(get_current_user),
) -> Customer:
    customer = Customer(
        owner_id=current_user,
        company_name=payload.company_name,
        customer_type=payload.customer_type,
        industry=payload.industry,
        primary_contacts=payload.primary_contacts,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("", response_model=list[CustomerRead])
def list_customers(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: uuid.UUID = Depends(get_current_user),
) -> list[Customer]:
    return (
        db.query(Customer)
        .filter(Customer.owner_id == current_user)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{customer_id}", response_model=CustomerRead)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: uuid.UUID = Depends(get_current_user),
) -> Customer:
    customer = (
        db.query(Customer)
        .filter(Customer.id == customer_id, Customer.owner_id == current_user)
        .first()
    )
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found.")
    return customer


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: uuid.UUID = Depends(get_current_user),
) -> None:
    customer = (
        db.query(Customer)
        .filter(Customer.id == customer_id, Customer.owner_id == current_user)
        .first()
    )
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found.")
    db.delete(customer)
    db.commit()
