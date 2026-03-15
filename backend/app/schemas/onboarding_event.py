from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import EventType


class OnboardingEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    task_id: int | None
    event_type: EventType
    message: str
    created_at: datetime
