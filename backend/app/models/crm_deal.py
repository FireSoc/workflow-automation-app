import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, JSON, String, Text, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import CustomerType, DealStatus


class CRMDeal(Base):
    """Incoming won business from a CRM. Ingested when deal is marked Closed Won."""

    __tablename__ = "crm_deals"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    owner_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    crm_source: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    segment: Mapped[CustomerType] = mapped_column(
        Enum(CustomerType, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        index=True,
    )
    products_purchased: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    target_go_live_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    contract_start_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    implementation_owner: Mapped[str | None] = mapped_column(String(255), nullable=True)
    csm_owner: Mapped[str | None] = mapped_column(String(255), nullable=True)
    special_requirements: Mapped[str | None] = mapped_column(Text, nullable=True)
    deal_status: Mapped[DealStatus] = mapped_column(
        Enum(DealStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=DealStatus.CLOSED_WON,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    projects: Mapped[list["OnboardingProject"]] = relationship(  # noqa: F821
        back_populates="source_deal", foreign_keys="OnboardingProject.source_deal_id"
    )
