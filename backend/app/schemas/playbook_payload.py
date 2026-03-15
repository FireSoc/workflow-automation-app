"""
Strict schema for playbook payloads (task templates, duration rules, stages).

Playbooks are segment-scoped onboarding blueprints: they define default_stages
and default_tasks (TaskTemplate) used to generate onboarding projects. Keys in
duration_rules must be OnboardingStage values; assigned_to can be a literal or
"implementation_owner" / "csm_owner" (resolved at project/task generation time).

Example task template (JSON):
  {"stage": "kickoff", "title": "Sign contract", "due_offset_days": 3,
   "assigned_to": "implementation_owner", "required_for_stage_completion": true}

Example duration_rules (JSON):
  {"kickoff": 7, "setup": 14, "integration": 14, "training": 7, "go_live": 3}
"""

from typing import Literal

from pydantic import BaseModel, field_validator

STAGE_VALUES = ("kickoff", "setup", "integration", "training", "go_live")
StageLiteral = Literal["kickoff", "setup", "integration", "training", "go_live"]


class TaskTemplate(BaseModel):
    """One task definition in a playbook's default_tasks."""

    stage: StageLiteral
    title: str
    description: str | None = None
    assigned_to: str | None = None  # literal or "implementation_owner" / "csm_owner"
    due_offset_days: int | None = None
    dependency_ids: list[int] | None = None
    owner_type: str | None = None
    owner_id: str | None = None
    required_for_stage_completion: bool = True
    is_customer_required: bool = False
    requires_setup_data: bool = False
    task_type: str | None = None  # e.g. "internal", "customer"


def validate_stage_keys(v: dict[str, int] | None) -> dict[str, int] | None:
    """Ensure duration_rules keys are valid OnboardingStage values."""
    if v is None:
        return None
    invalid = [k for k in v if k not in STAGE_VALUES]
    if invalid:
        raise ValueError(f"duration_rules keys must be in {STAGE_VALUES}; got {invalid}")
    return v


def validate_default_stages(v: list[str]) -> list[str]:
    """Ensure default_stages are non-empty and only valid stage values."""
    if not v:
        raise ValueError("default_stages must be non-empty")
    invalid = [s for s in v if s not in STAGE_VALUES]
    if invalid:
        raise ValueError(f"default_stages entries must be in {STAGE_VALUES}; got {invalid}")
    return v
