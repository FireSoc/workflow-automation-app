import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, JSON, String, Text, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import CustomerType


class Customer(Base):
    """Customer account for onboarding (company_name, segment, onboarding health)."""

    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    owner_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    customer_type: Mapped[CustomerType] = mapped_column(
        Enum(CustomerType, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    industry: Mapped[str | None] = mapped_column(String(255), nullable=True)
    primary_contacts: Mapped[list | None] = mapped_column(JSON, nullable=True)
    onboarding_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    current_risk_level: Mapped[str | None] = mapped_column(String(32), nullable=True)
    health_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
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
        back_populates="customer", cascade="all, delete-orphan"
    )
