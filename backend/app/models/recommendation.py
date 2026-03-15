from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import RecommendationActionType


class Recommendation(Base):
    """Suggested next action for an onboarding project (rules-based)."""

    __tablename__ = "recommendations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("onboarding_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    task_id: Mapped[int | None] = mapped_column(
        ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True
    )
    action_type: Mapped[RecommendationActionType] = mapped_column(
        Enum(RecommendationActionType), nullable=False
    )
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    dismissed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    label: Mapped[str | None] = mapped_column(String(255), nullable=True)

    project: Mapped["OnboardingProject"] = relationship(  # noqa: F821
        back_populates="recommendations"
    )
