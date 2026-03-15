from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import OnboardingStage, TaskStatus, TaskType


class Task(Base):
    """Unit of work inside an onboarding stage; can have dependencies and blocker flag."""

    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("onboarding_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    stage: Mapped[OnboardingStage] = mapped_column(
        Enum(OnboardingStage), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    assigned_to: Mapped[str | None] = mapped_column(String(255), nullable=True)
    owner_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    owner_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus), nullable=False, default=TaskStatus.NOT_STARTED
    )
    due_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    dependency_ids: Mapped[list | None] = mapped_column(JSON, nullable=True)
    blocker_flag: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    blocker_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    task_type: Mapped[str | None] = mapped_column(String(32), nullable=True)

    required_for_stage_completion: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )
    is_customer_required: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    requires_setup_data: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
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

    project: Mapped["OnboardingProject"] = relationship(back_populates="tasks")  # noqa: F821
    events: Mapped[list["OnboardingEvent"]] = relationship(  # noqa: F821
        back_populates="task"
    )
