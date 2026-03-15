from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RiskSignalRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    signal_type: str
    description: str
    severity: str | None
    created_at: datetime
