"""Structured project summary for display and optional AI phrasing."""

from app.models.enums import OnboardingStage, ProjectStatus, TaskStatus
from app.models.onboarding_project import OnboardingProject
from app.schemas.project import ProjectSummaryResponse


def build_summary(project: OnboardingProject) -> ProjectSummaryResponse:
    """
    Build deterministic summary from project state. Structured logic is source of truth;
    AI can be layered later for wording.
    """
    tasks = project.tasks or []
    completed = [t for t in tasks if t.status == TaskStatus.COMPLETED]
    blocked = [t for t in tasks if getattr(t, "blocker_flag", False)]
    overdue = [t for t in tasks if t.status == TaskStatus.OVERDUE]
    stage_tasks = [t for t in tasks if t.stage == project.current_stage]
    stage_done = [t for t in stage_tasks if t.status == TaskStatus.COMPLETED]

    what_is_complete = (
        f"{len(completed)} of {len(tasks)} tasks completed. "
        f"Current stage: {project.current_stage.value} ({len(stage_done)}/{len(stage_tasks)} tasks done)."
    )
    if not tasks:
        what_is_complete = "No tasks yet; project just created."

    what_is_blocked = "No blockers."
    if blocked:
        what_is_blocked = "; ".join(
            f"{t.title}: {getattr(t, 'blocker_reason', 'Blocked')}" for t in blocked[:5]
        )

    why_risk_elevated = "Risk is low."
    if project.risk_flag and project.health_summary:
        why_risk_elevated = project.health_summary
    elif overdue:
        why_risk_elevated = f"{len(overdue)} overdue task(s) affecting timeline."

    what_happens_next = (
        f"Complete remaining tasks in {project.current_stage.value} to advance. "
        f"Next stage: {_next_stage_label(project.current_stage)}."
    )
    if project.status == ProjectStatus.COMPLETED:
        what_happens_next = "Onboarding complete."
    elif project.next_best_action:
        what_happens_next = f"Next: {project.next_best_action}"

    go_live_realistic = "On track."
    if project.target_go_live_date and (blocked or overdue) and project.risk_flag:
        go_live_realistic = "At risk; go-live date may slip unless blockers are resolved."
    if project.status == ProjectStatus.COMPLETED:
        go_live_realistic = "Go-live achieved."

    return ProjectSummaryResponse(
        what_is_complete=what_is_complete,
        what_is_blocked=what_is_blocked,
        why_risk_elevated=why_risk_elevated,
        what_happens_next=what_happens_next,
        go_live_realistic=go_live_realistic,
    )


def _next_stage_label(current: OnboardingStage) -> str:
    from app.models.enums import STAGE_ORDER
    try:
        idx = STAGE_ORDER.index(current)
        if idx + 1 < len(STAGE_ORDER):
            return STAGE_ORDER[idx + 1].value.replace("_", " ")
    except (ValueError, AttributeError):
        pass
    return "—"
