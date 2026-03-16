from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import OnboardingStage, TaskStatus


class TaskCreate(BaseModel):
    """Payload for creating a task manually on a project."""

    title: str
    stage: OnboardingStage
    description: str | None = None
    due_date: datetime | None = None
    required_for_stage_completion: bool = True
    is_customer_required: bool = False
    requires_setup_data: bool = False


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    stage: OnboardingStage
    title: str
    description: str | None
    assigned_to: str | None
    owner_type: str | None
    owner_id: str | None
    status: TaskStatus
    due_date: datetime | None
    dependency_ids: list | None
    blocker_flag: bool
    blocker_reason: str | None
    completed_at: datetime | None
    task_type: str | None
    required_for_stage_completion: bool
    is_customer_required: bool
    requires_setup_data: bool
    created_at: datetime
    updated_at: datetime


class TaskCompleteResponse(BaseModel):
    task: TaskRead
    stage_advanced: bool
    new_stage: OnboardingStage | None
    project_completed: bool
    message: str
