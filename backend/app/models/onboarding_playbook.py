from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import CustomerType


class OnboardingPlaybook(Base):
    """
    Reusable onboarding blueprint. Defines default stages, tasks, branching and duration rules.
    Used to generate onboarding projects from CRM deals.
    """

    __tablename__ = "onboarding_playbooks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    segment: Mapped[CustomerType] = mapped_column(
        Enum(CustomerType, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        index=True,
    )
    supported_products: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    default_stages: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    default_tasks: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    branching_rules: Mapped[list | dict] = mapped_column(JSON, nullable=True)
    duration_rules: Mapped[dict | None] = mapped_column(JSON, nullable=True)
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
        back_populates="playbook"
    )
