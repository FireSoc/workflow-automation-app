"""
Deterministic, stateless workflow risk simulation engine — v2 Decision Sandbox.

Architecture
------------
- Pure functions: no DB writes, no side effects — safe to call any time.
- Deterministic: identical input always produces identical output.
- Composable: build SimulationTaskInput lists from raw payloads or ORM objects.
- Config-aware: reuses the same risk thresholds as the live risk service.

v2 additions
------------
  score_task(task, assumptions) -> TaskAssessment
    Scores each task across four drivers (slack, external, dependency, complexity)
    and derives risk_band, urgency, criticality, and action_priority.
    Returns top-3 explainability reasons and a ranked fallback action.

  generate_inbox_preview(tasks, task_assessments, assumptions) -> VirtualInboxPreview
    Derives an ephemeral two-sided inbox from simulation results.
    Completely stateless — no DB touch.

  run_simulation(customer_type, tasks, assumptions) -> SimulationResponse
    Extended to include task_assessments and inbox_preview in the response.

  run_compare(customer_type, baseline_tasks, baseline_assumptions, branches)
    -> SimulationCompareResponse
    Runs baseline + each branch independently, then produces delta summaries.

Public API
----------
  run_simulation(customer_type, tasks, assumptions)   -> SimulationResponse
  simulate_from_project(project, assumptions)         -> SimulationResponse
  run_compare(customer_type, baseline_tasks,
              baseline_assumptions, branches)         -> SimulationCompareResponse
"""

from collections import defaultdict

from app.core.config import settings
from app.models.enums import OnboardingStage, TaskStatus, STAGE_ORDER
from app.schemas.simulation import (
    BranchScenarioRequest,
    BranchScenarioResult,
    ComparisonSummary,
    SimulationAssumptions,
    SimulationCompareResponse,
    SimulationRequest,
    SimulationResponse,
    SimulationRiskSignal,
    SimulationStageResult,
    SimulationTaskInput,
    TaskAssessment,
    VirtualInboxMessage,
    VirtualInboxPreview,
)


# ---------------------------------------------------------------------------
# v2 scoring helpers
# ---------------------------------------------------------------------------

def _slack_risk_score(task: SimulationTaskInput, assumptions: SimulationAssumptions) -> float:
    """
    Risk from deadline slack.

    effective_work = estimated_duration + delay already incurred +
                     customer or internal delay assumption.
    slack = due_offset_days - effective_work
    """
    delay = (
        assumptions.effective_customer_delay()
        if task.is_customer_required
        else assumptions.effective_internal_delay()
    )
    effective_work = task.estimated_duration_days + task.delay_days + delay
    slack = task.due_offset_days - effective_work

    if slack <= 0:
        return 100.0
    if slack <= 1:
        return 80.0
    if slack <= 3:
        return 55.0
    return 25.0


def _external_dependency_score(task: SimulationTaskInput) -> float:
    """Risk from customer/external dependency."""
    return 80.0 if task.is_customer_required else 30.0


def _dependency_chain_score(task: SimulationTaskInput) -> float:
    """Risk from depth of predecessor task chain."""
    if task.dependency_count == 0:
        return 20.0
    if task.dependency_count == 1:
        return 45.0
    if task.dependency_count == 2:
        return 65.0
    return 85.0


def _complexity_score(task: SimulationTaskInput) -> float:
    """Risk from setup-data dependency, integration, and approval layers."""
    score = 20.0
    if task.requires_setup_data:
        score += 20.0
    if task.integration_required:
        score += 25.0
    score += 10.0 * task.approval_layers
    return min(score, 100.0)


def _urgency_score(task: SimulationTaskInput) -> float:
    """Urgency based on how soon the deadline is."""
    d = task.due_offset_days
    if d <= 2:
        return 90.0
    if d <= 5:
        return 70.0
    if d <= 10:
        return 45.0
    return 25.0


def _criticality_score(task: SimulationTaskInput) -> float:
    """Maps criticality 1-4 to a 0-100 score."""
    return {1: 25.0, 2: 50.0, 3: 75.0, 4: 100.0}.get(task.criticality, 50.0)


def _risk_band(score: float) -> str:
    if score >= 80:
        return "Critical"
    if score >= 60:
        return "Elevated"
    if score >= 40:
        return "Guarded"
    return "Low"


def _build_reasons(
    slack: float,
    external: float,
    dependency: float,
    complexity: float,
    task: SimulationTaskInput,
    assumptions: SimulationAssumptions,
) -> list[str]:
    """Return top-3 human-readable reasons ordered by driver score (descending)."""
    drivers: list[tuple[float, str]] = []

    delay = (
        assumptions.effective_customer_delay()
        if task.is_customer_required
        else assumptions.effective_internal_delay()
    )
    effective_work = task.estimated_duration_days + task.delay_days + delay
    slack_days = task.due_offset_days - effective_work

    if slack >= 55:
        drivers.append(
            (slack, f"Short slack ({slack_days:.1f} days) leaves little room for delay.")
        )
    elif slack >= 25:
        drivers.append(
            (slack, f"Moderate slack ({slack_days:.1f} days) — minor delays could push this overdue.")
        )

    if external >= 60:
        drivers.append(
            (external, "Customer-dependent task increases response-time uncertainty.")
        )

    if dependency >= 45:
        drivers.append(
            (
                dependency,
                f"Dependency chain of {task.dependency_count} predecessor task(s) increases cascade risk.",
            )
        )

    if complexity >= 45:
        parts = []
        if task.integration_required:
            parts.append("integration")
        if task.requires_setup_data:
            parts.append("setup data")
        if task.approval_layers > 0:
            parts.append(f"{task.approval_layers} approval layer(s)")
        drivers.append(
            (complexity, f"Execution complexity: {', '.join(parts)} required.")
        )

    # Sort by driver score descending, return text of top 3
    drivers.sort(key=lambda x: x[0], reverse=True)
    return [r for _, r in drivers[:3]]


def _build_fallback(
    slack: float,
    external: float,
    dependency: float,
    complexity: float,
) -> str:
    """Return the single highest-impact fallback action."""
    # Pick the highest driver
    top = max(
        (slack, "slack"),
        (external, "external"),
        (dependency, "dependency"),
        (complexity, "complexity"),
    )
    driver = top[1]

    if driver == "slack":
        return "Move due date earlier or split into two milestones to create buffer."
    if driver == "external":
        return "Send the customer request earlier and add an auto-reminder at 24-hour intervals."
    if driver == "dependency":
        return "Parallelise predecessor tasks or pre-approve dependencies before this stage begins."
    return "Create a pre-checklist for integrations and approvals before the stage kickoff."


def score_task(task: SimulationTaskInput, assumptions: SimulationAssumptions) -> TaskAssessment:
    """
    Full v2 per-task assessment.

    Returns risk/urgency/criticality scores, band, top reasons, and fallback.
    """
    slack = _slack_risk_score(task, assumptions)
    external = _external_dependency_score(task)
    dependency = _dependency_chain_score(task)
    complexity = _complexity_score(task)

    risk_score = round(
        0.40 * slack
        + 0.25 * external
        + 0.20 * dependency
        + 0.15 * complexity,
        2,
    )
    urgency = _urgency_score(task)
    crit = _criticality_score(task)
    action_priority = round(0.50 * risk_score + 0.30 * urgency + 0.20 * crit, 2)

    reasons = _build_reasons(slack, external, dependency, complexity, task, assumptions)
    fallback = _build_fallback(slack, external, dependency, complexity)

    return TaskAssessment(
        task_title=task.title,
        stage=task.stage,
        slack_risk_score=slack,
        external_dependency_score=external,
        dependency_chain_score=dependency,
        complexity_score=complexity,
        risk_score=risk_score,
        risk_band=_risk_band(risk_score),
        urgency_score=urgency,
        criticality_score=crit,
        action_priority_score=action_priority,
        top_reasons=reasons,
        recommended_fallback=fallback,
    )


# ---------------------------------------------------------------------------
# Ephemeral inbox generation
# ---------------------------------------------------------------------------

_EVENT_SUBJECTS = {
    "email_sent": "Action required: {task}",
    "awaiting_reply": "Awaiting response: {task}",
    "reminder_sent": "Reminder: {task} due soon",
    "reply_received": "Response received: {task}",
    "deadline_warning": "Risk alert: {task} approaching deadline",
    "deadline_missed": "MISSED: {task} is overdue",
}

_EVENT_BODIES = {
    "email_sent": "We have initiated '{task}'. Please review and take action at your earliest convenience.",
    "awaiting_reply": "We are waiting for your response on '{task}'. This is required to proceed.",
    "reminder_sent": "This is a reminder that '{task}' is due soon. Please confirm your progress.",
    "reply_received": "Your counterparty has responded to '{task}'. Review the reply to proceed.",
    "deadline_warning": "'{task}' has a {band} risk level — the deadline is approaching with limited slack.",
    "deadline_missed": "'{task}' has passed its target date. Immediate action required.",
}


def generate_inbox_preview(
    tasks: list[SimulationTaskInput],
    task_assessments: list[TaskAssessment],
    assumptions: SimulationAssumptions,
) -> VirtualInboxPreview:
    """
    Produce an ephemeral two-sided virtual inbox from simulation results.

    Rules
    -----
    - email_sent at day (due_offset_days - estimated_duration_days), clamped to 0,
      so initiation emails are staggered by when the task is due (not all on day 0).
    - awaiting_reply at (email_day + 0.5) for customer-required tasks.
    - reminder_sent at (due_offset - 1) for Elevated/Critical tasks.
    - reply_received at (due_offset + customer_delay) for customer-required tasks.
    - deadline_warning for Elevated/Critical tasks at due_offset - 0.5.
    - deadline_missed for tasks where effective work > due_offset.
    """
    assessment_map: dict[str, TaskAssessment] = {a.task_title: a for a in task_assessments}

    sent: list[VirtualInboxMessage] = []
    received: list[VirtualInboxMessage] = []

    for task in tasks:
        a = assessment_map.get(task.title)
        band = a.risk_band if a else "Low"

        def _msg(event_type: str, day: float, inbox: str) -> VirtualInboxMessage:
            subject = _EVENT_SUBJECTS[event_type].format(task=task.title)
            body = _EVENT_BODIES[event_type].format(task=task.title, band=band)
            return VirtualInboxMessage(
                day=round(day, 1),
                event_type=event_type,
                subject=subject,
                body_preview=body,
                task_title=task.title,
                risk_band=band,
            )

        # Stagger email_sent by when the task is due (initiation ~ duration before due)
        email_day = max(0.0, float(task.due_offset_days) - task.estimated_duration_days)
        sent.append(_msg("email_sent", email_day, "sent"))

        if task.is_customer_required:
            # Sender side: awaiting reply shortly after email sent
            sent.append(_msg("awaiting_reply", email_day + 0.5, "sent"))

            # Recipient side: simulated response arrives after customer delay
            reply_day = task.due_offset_days + assumptions.effective_customer_delay()
            received.append(_msg("reply_received", reply_day, "received"))

        if band in ("Elevated", "Critical"):
            # Proactive reminder one day before deadline
            reminder_day = max(0.0, task.due_offset_days - 1)
            sent.append(_msg("reminder_sent", reminder_day, "sent"))

            # Deadline warning half-day before due
            warn_day = max(0.0, task.due_offset_days - 0.5)
            received.append(_msg("deadline_warning", warn_day, "received"))

        # Flag missed deadlines
        delay = (
            assumptions.effective_customer_delay()
            if task.is_customer_required
            else assumptions.effective_internal_delay()
        )
        effective_end = task.estimated_duration_days + task.delay_days + delay
        if effective_end > task.due_offset_days:
            received.append(_msg("deadline_missed", task.due_offset_days + 0.1, "received"))

    # Sort each list chronologically
    sent.sort(key=lambda m: m.day)
    received.sort(key=lambda m: m.day)

    return VirtualInboxPreview(
        sender_label="Your Company (CSM)",
        recipient_label="Customer Company",
        sent_messages=sent,
        received_messages=received,
    )


# ---------------------------------------------------------------------------
# Stage-level simulation (unchanged logic — extended to pass v2 assumptions)
# ---------------------------------------------------------------------------

def _projected_due_day(task: SimulationTaskInput, assumptions: SimulationAssumptions) -> float:
    base = float(task.due_offset_days + task.delay_days)

    if task.is_customer_required:
        base += assumptions.effective_customer_delay()
    else:
        base += assumptions.effective_internal_delay()

    if task.requires_setup_data:
        base += assumptions.setup_data_delay_days

    return base


def _is_projected_overdue(task: SimulationTaskInput, projected_day: float) -> bool:
    return projected_day > float(task.due_offset_days)


def _simulate_stage(
    stage: OnboardingStage,
    stage_tasks: list[SimulationTaskInput],
    assumptions: SimulationAssumptions,
    overdue_threshold_days: int,
) -> tuple[SimulationStageResult, list[SimulationRiskSignal]]:
    required_tasks = [t for t in stage_tasks if t.required_for_stage_completion]
    blocker_titles: list[str] = []
    overdue_titles: list[str] = []
    risk_signals: list[SimulationRiskSignal] = []
    gate_blocked_reason: str | None = None
    can_advance = True
    max_required_day: float = 0.0
    all_task_days: list[float] = []

    for task in stage_tasks:
        proj_day = _projected_due_day(task, assumptions)
        all_task_days.append(proj_day)

        if task.required_for_stage_completion:
            max_required_day = max(max_required_day, proj_day)

        if task.current_status == TaskStatus.COMPLETED:
            continue

        if _is_projected_overdue(task, proj_day):
            overdue_titles.append(task.title)

            if task.required_for_stage_completion:
                slip = proj_day - task.due_offset_days
                if slip > overdue_threshold_days:
                    risk_signals.append(
                        SimulationRiskSignal(
                            rule="overdue_threshold",
                            stage=stage,
                            task_title=task.title,
                            detail=(
                                f"Required task '{task.title}' is projected to be "
                                f"{slip:.1f} day(s) overdue, exceeding the "
                                f"{overdue_threshold_days}-day risk threshold."
                            ),
                        )
                    )

        if task.required_for_stage_completion:
            is_late = _is_projected_overdue(task, proj_day)
            if task.is_customer_required and assumptions.effective_customer_delay() > 0 and is_late:
                blocker_titles.append(task.title)
                if can_advance:
                    gate_blocked_reason = (
                        f"Customer-required task '{task.title}' will be delayed "
                        f"by {assumptions.effective_customer_delay():.1f} day(s)."
                    )
                    can_advance = False
            elif task.requires_setup_data and assumptions.setup_data_delay_days > 0 and is_late:
                blocker_titles.append(task.title)
                if can_advance:
                    gate_blocked_reason = (
                        f"Task '{task.title}' requires setup data; "
                        f"{assumptions.setup_data_delay_days:.1f}-day data lag projected."
                    )
                    can_advance = False

    required_overdue = [
        t for t in required_tasks
        if t.current_status != TaskStatus.COMPLETED
        and _is_projected_overdue(t, _projected_due_day(t, assumptions))
    ]
    if len(required_overdue) >= settings.risk_required_overdue_count:
        risk_signals.append(
            SimulationRiskSignal(
                rule="multi_overdue",
                stage=stage,
                task_title=None,
                detail=(
                    f"{len(required_overdue)} required task(s) are projected overdue "
                    f"in stage '{stage.value}', meeting the multi-overdue risk rule "
                    f"(threshold: {settings.risk_required_overdue_count})."
                ),
            )
        )

    return SimulationStageResult(
        stage=stage,
        total_tasks=len(stage_tasks),
        required_tasks=len(required_tasks),
        customer_required_tasks=sum(1 for t in stage_tasks if t.is_customer_required),
        setup_data_tasks=sum(1 for t in stage_tasks if t.requires_setup_data),
        projected_duration_days=(
            max_required_day if max_required_day > 0
            else (max(all_task_days) if all_task_days else 0.0)
        ),
        blocker_tasks=blocker_titles,
        overdue_tasks=overdue_titles,
        can_advance=can_advance,
        gate_blocked_reason=gate_blocked_reason,
    ), risk_signals


# ---------------------------------------------------------------------------
# Recommendation / fallback generation (decision layer)
# ---------------------------------------------------------------------------

def _build_recommendations(
    stage_results: list[SimulationStageResult],
    all_signals: list[SimulationRiskSignal],
    assumptions: SimulationAssumptions,
    task_assessments: list[TaskAssessment],
) -> list[str]:
    """
    Produce a ranked, deduplicated list of actionable recommendations.

    v2: also incorporates per-task fallbacks from task_assessments,
    de-duplicated and ordered by action_priority_score.
    """
    recs: list[str] = []

    blocked_stages = [r for r in stage_results if not r.can_advance]
    for sr in blocked_stages:
        recs.append(
            f"Stage '{sr.stage.value}' has {len(sr.blocker_tasks)} blocker task(s). "
            "Consider sending pre-filled forms or scheduling these earlier to "
            "reduce dependency on customer response time."
        )

    if assumptions.effective_customer_delay() > 0:
        customer_required_total = sum(r.customer_required_tasks for r in stage_results)
        if customer_required_total > 0:
            recs.append(
                f"With a {assumptions.effective_customer_delay():.1f}-day customer delay assumption, "
                f"{customer_required_total} customer-required task(s) will slip. "
                "Move customer tasks to the earliest possible position within each stage."
            )

    if assumptions.setup_data_delay_days > 0:
        setup_data_total = sum(r.setup_data_tasks for r in stage_results)
        if setup_data_total > 0:
            recs.append(
                f"Setup data is delayed by {assumptions.setup_data_delay_days:.1f} day(s), "
                f"affecting {setup_data_total} task(s). "
                "Collect setup data at kickoff via intake form to unblock downstream work."
            )

    threshold_signals = [s for s in all_signals if s.rule == "overdue_threshold"]
    if threshold_signals:
        recs.append(
            f"{len(threshold_signals)} required task(s) are projected to breach the "
            f"{settings.risk_overdue_threshold_days}-day overdue risk threshold. "
            "Reduce due_offset_days for these tasks or add earlier reminder triggers."
        )

    multi_signals = [s for s in all_signals if s.rule == "multi_overdue"]
    if multi_signals:
        affected = {s.stage.value for s in multi_signals}
        recs.append(
            f"Stage(s) {sorted(affected)} each have multiple required tasks projected overdue simultaneously. "
            "Stagger due dates to avoid compounding delays."
        )

    dense_stages = [r for r in stage_results if r.required_tasks > 5]
    if dense_stages:
        names = [r.stage.value for r in dense_stages]
        recs.append(
            f"Stage(s) {names} each have more than 5 required tasks. "
            "Consider splitting them into sub-stages to reduce cognitive load on customers."
        )

    # v2: surface top-priority task-level fallbacks (deduplicated)
    seen_fallbacks: set[str] = set()
    critical_tasks = sorted(
        [a for a in task_assessments if a.risk_band in ("Critical", "Elevated")],
        key=lambda a: a.action_priority_score,
        reverse=True,
    )
    for a in critical_tasks[:3]:
        fallback = f"[{a.risk_band}] '{a.task_title}': {a.recommended_fallback}"
        if fallback not in seen_fallbacks:
            seen_fallbacks.add(fallback)
            recs.append(fallback)

    if not recs:
        recs.append(
            "No significant risk signals detected under these assumptions. "
            "The workflow is well-structured for the given scenario."
        )

    return recs


def _build_summary(
    customer_type: str,
    stage_results: list[SimulationStageResult],
    all_signals: list[SimulationRiskSignal],
    projected_ttfv: float,
    projected_total: float,
    at_risk: bool,
    task_assessments: list[TaskAssessment],
) -> str:
    blocked_count = sum(1 for r in stage_results if not r.can_advance)
    overdue_count = sum(len(r.overdue_tasks) for r in stage_results)
    critical_count = sum(1 for a in task_assessments if a.risk_band == "Critical")
    elevated_count = sum(1 for a in task_assessments if a.risk_band == "Elevated")
    status_word = "AT-RISK" if at_risk else "HEALTHY"

    parts = [
        f"[{status_word}] {customer_type.upper()} workflow simulation: "
        f"{len(stage_results)} stage(s) across "
        f"{sum(r.total_tasks for r in stage_results)} task(s).",
        f"Projected time-to-first-value: {projected_ttfv:.1f} day(s); "
        f"total onboarding: {projected_total:.1f} day(s).",
        f"{blocked_count} stage gate(s) blocked, {overdue_count} task(s) projected overdue, "
        f"{len(all_signals)} risk signal(s).",
    ]
    if task_assessments:
        parts.append(
            f"Task risk breakdown — Critical: {critical_count}, "
            f"Elevated: {elevated_count}, "
            f"Guarded: {sum(1 for a in task_assessments if a.risk_band == 'Guarded')}, "
            f"Low: {sum(1 for a in task_assessments if a.risk_band == 'Low')}."
        )

    return " ".join(parts)


# ---------------------------------------------------------------------------
# Public API — run_simulation
# ---------------------------------------------------------------------------


def run_simulation(
    customer_type: str,
    tasks: list[SimulationTaskInput],
    assumptions: SimulationAssumptions,
) -> SimulationResponse:
    """
    Core deterministic simulation engine.

    v2: also runs per-task scoring and generates ephemeral inbox preview.
    """
    by_stage: dict[OnboardingStage, list[SimulationTaskInput]] = defaultdict(list)
    for task in tasks:
        by_stage[task.stage].append(task)

    stages_to_simulate = [s for s in STAGE_ORDER if s in by_stage]

    stage_results: list[SimulationStageResult] = []
    all_signals: list[SimulationRiskSignal] = []
    cumulative_days: float = 0.0
    ttfv_days: float | None = None

    for stage in stages_to_simulate:
        stage_tasks = by_stage[stage]
        result, signals = _simulate_stage(
            stage,
            stage_tasks,
            assumptions,
            settings.risk_overdue_threshold_days,
        )

        stage_start = cumulative_days
        cumulative_days = stage_start + result.projected_duration_days

        result = SimulationStageResult(
            **{**result.model_dump(), "projected_duration_days": cumulative_days}
        )

        if ttfv_days is None:
            ttfv_days = cumulative_days

        stage_results.append(result)
        all_signals.extend(signals)

    if cumulative_days > settings.risk_stalled_threshold_days and not tasks:
        all_signals.append(
            SimulationRiskSignal(
                rule="stalled",
                stage=STAGE_ORDER[0],
                task_title=None,
                detail=(
                    f"No tasks defined; project would stall immediately, "
                    f"exceeding the {settings.risk_stalled_threshold_days}-day stalled threshold."
                ),
            )
        )

    # v2: score each task
    task_assessments = [score_task(t, assumptions) for t in tasks]

    at_risk = len(all_signals) > 0
    projected_ttfv = ttfv_days or 0.0
    projected_total = cumulative_days

    recommendations = _build_recommendations(stage_results, all_signals, assumptions, task_assessments)
    summary = _build_summary(
        customer_type, stage_results, all_signals, projected_ttfv, projected_total, at_risk, task_assessments
    )

    # v2: generate ephemeral inbox
    inbox = generate_inbox_preview(tasks, task_assessments, assumptions) if tasks else None

    return SimulationResponse(
        customer_type=customer_type,
        total_tasks=len(tasks),
        stages_simulated=len(stage_results),
        projected_ttfv_days=projected_ttfv,
        projected_total_days=projected_total,
        at_risk=at_risk,
        risk_signals=all_signals,
        stage_results=stage_results,
        recommendations=recommendations,
        summary=summary,
        task_assessments=task_assessments,
        inbox_preview=inbox,
    )


def get_project_baseline(project) -> tuple[str, list[SimulationTaskInput]]:
    """
    Build (customer_type, sim_tasks) from a persisted OnboardingProject.
    Used for run-from-project simulation and for compare baseline when using a real project.
    """
    from datetime import datetime, timezone as tz

    now = datetime.now(tz.utc)

    def _make_aware(dt: datetime) -> datetime:
        return dt if dt.tzinfo is not None else dt.replace(tzinfo=tz.utc)

    project_created = _make_aware(project.created_at)

    sim_tasks: list[SimulationTaskInput] = []
    for task in project.tasks:
        delay = 0
        if task.due_date is not None and task.status != TaskStatus.COMPLETED:
            due_aware = _make_aware(task.due_date)
            if due_aware < now:
                delay = int((now - due_aware).days)

        if task.due_date is not None:
            due_aware = _make_aware(task.due_date)
            offset = max(0, (due_aware - project_created).days)
        else:
            offset = 7

        sim_tasks.append(
            SimulationTaskInput(
                title=task.title,
                stage=task.stage,
                due_offset_days=offset,
                required_for_stage_completion=task.required_for_stage_completion,
                is_customer_required=task.is_customer_required,
                requires_setup_data=task.requires_setup_data,
                current_status=task.status,
                delay_days=delay,
                criticality=2,
                estimated_duration_days=1,
                dependency_count=0,
                integration_required=False,
                approval_layers=0,
            )
        )

    customer_type = project.customer.customer_type.value if project.customer else "unknown"
    return customer_type, sim_tasks


def simulate_from_project(
    project,  # OnboardingProject ORM object — typed loosely to avoid circular imports
    assumptions: SimulationAssumptions,
) -> SimulationResponse:
    """Build SimulationTaskInput from a persisted OnboardingProject and run simulation."""
    customer_type, sim_tasks = get_project_baseline(project)
    return run_simulation(customer_type, sim_tasks, assumptions)


# ---------------------------------------------------------------------------
# Public API — run_compare (branch simulation)
# ---------------------------------------------------------------------------


def _merge_branch_tasks(
    baseline: list[SimulationTaskInput],
    overrides: list[SimulationTaskInput],
) -> list[SimulationTaskInput]:
    """
    Merge branch task overrides into the baseline task list by title.

    Tasks whose title matches an override entry are replaced; others are kept.
    New titles in overrides are appended.
    """
    override_map = {t.title: t for t in overrides}
    merged = [override_map.get(t.title, t) for t in baseline]
    existing_titles = {t.title for t in baseline}
    for t in overrides:
        if t.title not in existing_titles:
            merged.append(t)
    return merged


def _avg_risk_score(response: SimulationResponse) -> float:
    if not response.task_assessments:
        return 0.0
    return sum(a.risk_score for a in response.task_assessments) / len(response.task_assessments)


def _build_comparison_summary(
    branch_name: str,
    baseline: SimulationResponse,
    branch: SimulationResponse,
) -> ComparisonSummary:
    base_risk = _avg_risk_score(baseline)
    branch_risk = _avg_risk_score(branch)
    risk_delta = round(branch_risk - base_risk, 2)
    ttfv_delta = round(branch.projected_ttfv_days - baseline.projected_ttfv_days, 2)
    total_delta = round(branch.projected_total_days - baseline.projected_total_days, 2)
    signal_delta = len(branch.risk_signals) - len(baseline.risk_signals)

    improvements: list[str] = []
    if risk_delta < 0:
        improvements.append(f"Average task risk score improved by {abs(risk_delta):.1f} points.")
    elif risk_delta > 0:
        improvements.append(f"Average task risk score worsened by {risk_delta:.1f} points.")

    if ttfv_delta < 0:
        improvements.append(f"Time-to-first-value reduced by {abs(ttfv_delta):.1f} day(s).")
    elif ttfv_delta > 0:
        improvements.append(f"Time-to-first-value increased by {ttfv_delta:.1f} day(s).")

    if signal_delta < 0:
        improvements.append(f"{abs(signal_delta)} fewer risk signal(s) vs baseline.")
    elif signal_delta > 0:
        improvements.append(f"{signal_delta} more risk signal(s) vs baseline.")

    return ComparisonSummary(
        branch_name=branch_name,
        risk_score_delta=risk_delta,
        ttfv_delta_days=ttfv_delta,
        total_duration_delta_days=total_delta,
        at_risk_changed=branch.at_risk != baseline.at_risk,
        risk_signal_delta=signal_delta,
        top_improvements=improvements[:3],
    )


def run_compare(
    customer_type: str,
    baseline_tasks: list[SimulationTaskInput],
    baseline_assumptions: SimulationAssumptions,
    branches: list[BranchScenarioRequest],
) -> SimulationCompareResponse:
    """
    Run the baseline simulation and each branch variant, then produce delta summaries.

    Still fully stateless — all branches run independently and in-process.
    """
    baseline_result = run_simulation(customer_type, baseline_tasks, baseline_assumptions)

    branch_results: list[BranchScenarioResult] = []
    comparisons: list[ComparisonSummary] = []

    for branch in branches:
        branch_assumptions = branch.assumptions_override or baseline_assumptions
        branch_tasks = _merge_branch_tasks(baseline_tasks, branch.task_overrides)
        branch_sim = run_simulation(customer_type, branch_tasks, branch_assumptions)

        branch_results.append(BranchScenarioResult(name=branch.name, result=branch_sim))
        comparisons.append(_build_comparison_summary(branch.name, baseline_result, branch_sim))

    # Overall recommendation: pick the branch with the lowest average risk score
    best_branch: str | None = None
    best_risk: float = _avg_risk_score(baseline_result)
    for br, comp in zip(branch_results, comparisons):
        br_risk = _avg_risk_score(br.result)
        if br_risk < best_risk:
            best_risk = br_risk
            best_branch = br.name

    if best_branch:
        overall_rec = (
            f"Branch '{best_branch}' yields the lowest average task risk score ({best_risk:.1f}/100). "
            "Apply its assumption and task changes for the best risk-adjusted outcome."
        )
    else:
        overall_rec = (
            "No branch improves on the baseline. Review task dependencies and deadlines "
            "before adjusting assumptions."
        )

    return SimulationCompareResponse(
        customer_type=customer_type,
        baseline=baseline_result,
        branches=branch_results,
        comparisons=comparisons,
        overall_recommendation=overall_rec,
    )
