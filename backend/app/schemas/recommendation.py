from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import RecommendationActionType


class RecommendationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    task_id: int | None
    action_type: RecommendationActionType
    priority: int
    dismissed: bool
    label: str | None
    created_at: datetime


class RecommendationDismiss(BaseModel):
    dismissed: bool = True
