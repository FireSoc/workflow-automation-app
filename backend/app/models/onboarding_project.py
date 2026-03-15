from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import OnboardingStage, ProjectStatus, RiskLevel


class OnboardingProject(Base):
    """Onboarding instance created from a won deal; tracks stage, risk, and go-live."""

    __tablename__ = "onboarding_projects"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    source_deal_id: Mapped[int | None] = mapped_column(
        ForeignKey("crm_deals.id", ondelete="SET NULL"), nullable=True, index=True
    )
    playbook_id: Mapped[int | None] = mapped_column(
        ForeignKey("onboarding_playbooks.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    current_stage: Mapped[OnboardingStage] = mapped_column(
        Enum(OnboardingStage), nullable=False, default=OnboardingStage.KICKOFF
    )
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus), nullable=False, default=ProjectStatus.ACTIVE
    )
    risk_flag: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    risk_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    risk_level: Mapped[RiskLevel | None] = mapped_column(
        Enum(RiskLevel), nullable=True
    )
    kickoff_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    target_go_live_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    projected_go_live_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    health_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    next_best_action: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
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

    customer: Mapped["Customer"] = relationship(back_populates="projects")  # noqa: F821
    source_deal: Mapped["CRMDeal | None"] = relationship(  # noqa: F821
        back_populates="projects", foreign_keys=[source_deal_id]
    )
    playbook: Mapped["OnboardingPlaybook | None"] = relationship(  # noqa: F821
        back_populates="projects", foreign_keys=[playbook_id]
    )
    tasks: Mapped[list["Task"]] = relationship(  # noqa: F821
        back_populates="project", cascade="all, delete-orphan"
    )
    events: Mapped[list["OnboardingEvent"]] = relationship(  # noqa: F821
        back_populates="project", cascade="all, delete-orphan"
    )
    risk_signals: Mapped[list["RiskSignal"]] = relationship(  # noqa: F821
        back_populates="project", cascade="all, delete-orphan"
    )
    recommendations: Mapped[list["Recommendation"]] = relationship(  # noqa: F821
        back_populates="project", cascade="all, delete-orphan"
    )
