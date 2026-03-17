import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import CustomerType


class CustomerCreate(BaseModel):
    company_name: str
    customer_type: CustomerType
    industry: str | None = None
    primary_contacts: list | None = None


class CustomerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: uuid.UUID | None
    company_name: str
    customer_type: CustomerType
    industry: str | None
    primary_contacts: list | None
    onboarding_status: str | None
    current_risk_level: str | None
    health_summary: str | None
    created_at: datetime
    updated_at: datetime
