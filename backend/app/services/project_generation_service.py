"""Generate stages and tasks from playbook with owner and deadline assignment."""

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.enums import OnboardingStage, STAGE_ORDER, TaskStatus
from app.models.onboarding_playbook import OnboardingPlaybook
from app.models.onboarding_project import OnboardingProject
from app.models.task import Task


def _resolve_assigned_to(
    assigned_to: str | None,
    implementation_owner: str | None,
    csm_owner: str | None,
) -> str | None:
    """Resolve placeholder to actual owner from deal."""
    if not assigned_to:
        return None
    a = (assigned_to or "").strip().lower()
    if a == "implementation_owner" and implementation_owner:
        return implementation_owner
    if a == "csm_owner" and csm_owner:
        return csm_owner
    return assigned_to


def generate_tasks_for_stage(
    db: Session,
    project: OnboardingProject,
    playbook: OnboardingPlaybook,
    stage: OnboardingStage,
    *,
    implementation_owner: str | None = None,
    csm_owner: str | None = None,
    kickoff_date: datetime | None = None,
    target_go_live_date: datetime | None = None,
) -> list[Task]:
    """
    Create Task rows from playbook.default_tasks for the given stage.
    Resolves assigned_to placeholders (implementation_owner, csm_owner),
    sets dependency_ids, owner_type, task_type, and due_date from duration_rules or due_offset_days.
    """
    tasks_config = playbook.default_tasks or []
    stage_val = stage.value if hasattr(stage, "value") else stage
    task_defs = [t for t in tasks_config if t.get("stage") == stage_val]
    if not task_defs:
        return []

    now = datetime.now(timezone.utc)
    base_date = kickoff_date or now
    duration_rules = playbook.duration_rules or {}
    stage_duration_days = duration_rules.get(stage_val) if isinstance(duration_rules, dict) else None

    created: list[Task] = []
    for td in task_defs:
        due_offset = td.get("due_offset_days")
        if due_offset is None and stage_duration_days is not None:
            due_offset = stage_duration_days
        if due_offset is None:
            due_offset = 7
        due_date = base_date + timedelta(days=due_offset)

        assigned_to = td.get("assigned_to")
        resolved = _resolve_assigned_to(assigned_to, implementation_owner, csm_owner)
        if resolved is None and assigned_to:
            resolved = assigned_to

        task = Task(
            project_id=project.id,
            stage=stage,
            title=td["title"],
            description=td.get("description"),
            assigned_to=resolved,
            owner_type=td.get("owner_type"),
            owner_id=td.get("owner_id"),
            status=TaskStatus.NOT_STARTED,
            due_date=due_date,
            dependency_ids=td.get("dependency_ids"),
            required_for_stage_completion=td.get("required_for_stage_completion", True),
            is_customer_required=td.get("is_customer_required", False),
            requires_setup_data=td.get("requires_setup_data", False),
            task_type=td.get("task_type"),
        )
        db.add(task)
        created.append(task)

    return created
