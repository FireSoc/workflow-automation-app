from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import CustomerType, DealStatus


class DealIngestPayload(BaseModel):
    """Payload for POST /crm/deals/ingest (closed-won deal from CRM)."""

    crm_source: str
    company_name: str
    segment: CustomerType
    products_purchased: list[str] = []
    target_go_live_date: datetime | None = None
    contract_start_date: datetime | None = None
    implementation_owner: str | None = None
    csm_owner: str | None = None
    special_requirements: str | None = None


class DealRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    crm_source: str
    company_name: str
    segment: CustomerType
    products_purchased: list
    target_go_live_date: datetime | None
    contract_start_date: datetime | None
    implementation_owner: str | None
    csm_owner: str | None
    special_requirements: str | None
    deal_status: DealStatus
    created_at: datetime
    updated_at: datetime
