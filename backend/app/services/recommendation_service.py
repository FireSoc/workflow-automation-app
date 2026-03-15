"""Rules-based next-best-action recommendations."""

from sqlalchemy.orm import Session

from app.models.enums import ProjectStatus, RecommendationActionType, TaskStatus
from app.models.onboarding_project import OnboardingProject
from app.models.recommendation import Recommendation


def generate_recommendations(
    db: Session, project: OnboardingProject
) -> list[Recommendation]:
    """
    Generate next-best actions from project state. Does not duplicate existing
    non-dismissed recommendations. Caller should commit.
    """
    existing = {
        (r.action_type, r.task_id)
        for r in project.recommendations
        if not r.dismissed
    }
    new_recs: list[Recommendation] = []

    if project.status == ProjectStatus.COMPLETED:
        return new_recs

    stage_tasks = [t for t in project.tasks if t.stage == project.current_stage]
    overdue = [t for t in project.tasks if t.status == TaskStatus.OVERDUE]
    blocked = [t for t in project.tasks if getattr(t, "blocker_flag", False)]
    customer_required_incomplete = [
        t for t in stage_tasks
        if t.is_customer_required and t.status != TaskStatus.COMPLETED
    ]

    # Remind customer admin when customer-required tasks are pending
    if customer_required_incomplete and (RecommendationActionType.REMIND_CUSTOMER_ADMIN, None) not in existing:
        r = Recommendation(
            project_id=project.id,
            task_id=customer_required_incomplete[0].id,
            action_type=RecommendationActionType.REMIND_CUSTOMER_ADMIN,
            priority=10,
            label="Remind customer admin to complete required steps",
        )
        db.add(r)
        new_recs.append(r)
        existing.add((RecommendationActionType.REMIND_CUSTOMER_ADMIN, r.task_id))

    # Escalate blocker
    if blocked and (RecommendationActionType.ESCALATE_BLOCKER, None) not in existing:
        r = Recommendation(
            project_id=project.id,
            task_id=blocked[0].id,
            action_type=RecommendationActionType.ESCALATE_BLOCKER,
            priority=20,
            label="Escalate blocker to unblock progress",
        )
        db.add(r)
        new_recs.append(r)
        existing.add((RecommendationActionType.ESCALATE_BLOCKER, r.task_id))

    # Reschedule training if we're in training and blocked/overdue
    from app.models.enums import OnboardingStage
    if (
        project.current_stage == OnboardingStage.TRAINING
        and (overdue or blocked)
        and (RecommendationActionType.RESCHEDULE_TRAINING, None) not in existing
    ):
        r = Recommendation(
            project_id=project.id,
            task_id=None,
            action_type=RecommendationActionType.RESCHEDULE_TRAINING,
            priority=15,
            label="Reschedule training session",
        )
        db.add(r)
        new_recs.append(r)
        existing.add((RecommendationActionType.RESCHEDULE_TRAINING, None))

    # Shift projected go-live if high risk
    if (
        project.risk_flag
        and project.target_go_live_date
        and (RecommendationActionType.SHIFT_PROJECTED_GO_LIVE, None) not in existing
    ):
        r = Recommendation(
            project_id=project.id,
            task_id=None,
            action_type=RecommendationActionType.SHIFT_PROJECTED_GO_LIVE,
            priority=5,
            label="Review and shift projected go-live date",
        )
        db.add(r)
        new_recs.append(r)
        existing.add((RecommendationActionType.SHIFT_PROJECTED_GO_LIVE, None))

    return new_recs


def get_next_best_action(project: OnboardingProject) -> str | None:
    """Return single next-best action label for project.next_best_action."""
    active = [r for r in project.recommendations if not r.dismissed]
    if not active:
        return None
    best = max(active, key=lambda r: (r.priority, -r.id))
    return best.label or best.action_type.value.replace("_", " ").title()
