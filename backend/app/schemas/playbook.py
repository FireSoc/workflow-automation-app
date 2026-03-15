from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.enums import CustomerType
from app.schemas.playbook_payload import (
    TaskTemplate,
    validate_default_stages,
    validate_stage_keys,
)


class PlaybookRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    segment: CustomerType
    supported_products: list
    default_stages: list
    default_tasks: list
    branching_rules: list | dict | None
    duration_rules: dict | None
    created_at: datetime
    updated_at: datetime


class PlaybookCreate(BaseModel):
    """Strict schema for creating a playbook (script-only path)."""

    name: str
    segment: CustomerType
    supported_products: list[str] = []
    default_stages: list[str]
    default_tasks: list[TaskTemplate]
    branching_rules: list | dict | None = None
    duration_rules: dict[str, int] | None = None

    @field_validator("default_stages")
    @classmethod
    def check_default_stages(cls, v: list[str]) -> list[str]:
        return validate_default_stages(v)

    @field_validator("duration_rules")
    @classmethod
    def check_duration_rules(cls, v: dict[str, int] | None) -> dict[str, int] | None:
        return validate_stage_keys(v)
