"""
Pydantic schemas for the deterministic, stateless workflow risk simulator.

v2 Decision Sandbox additions
------------------------------
- SimulationTaskInput gains v2 scoring fields (all optional/defaulted for backward compat).
- SimulationAssumptions gains customer_delay_days / internal_delay_days aliases.
- TaskAssessment: per-task risk/urgency/criticality scores, band, top reasons, fallback.
- VirtualInboxMessage / VirtualInboxPreview: ephemeral sandbox inbox for demo.
- BranchScenarioRequest / BranchScenarioResult: branch variant inputs and results.
- ComparisonSummary: delta view between baseline and a branch.
- SimulationCompareRequest / SimulationCompareResponse: top-level compare endpoint.
"""

from pydantic import BaseModel, Field

from app.models.enums import OnboardingStage, TaskStatus


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class SimulationTaskInput(BaseModel):
    """Describes one task definition for an ad-hoc simulation."""

    title: str = Field(..., min_length=1, max_length=255)
    stage: OnboardingStage
    due_offset_days: int = Field(..., ge=0)
    required_for_stage_completion: bool = True
    is_customer_required: bool = False
    requires_setup_data: bool = False
    current_status: TaskStatus = TaskStatus.NOT_STARTED
    delay_days: int = Field(default=0, ge=0)

    # --- v2 scoring fields (all optional with safe defaults) ---
    criticality: int = Field(
        default=2,
        ge=1,
        le=4,
        description="Business impact if deadline missed. 1=nice-to-have, 4=mission-critical.",
    )
    estimated_duration_days: int = Field(
        default=1,
        ge=1,
        description="Estimated working days to complete this task.",
    )
    dependency_count: int = Field(
        default=0,
        ge=0,
        description="Number of predecessor tasks this task depends on.",
    )
    integration_required: bool = Field(
        default=False,
        description="Whether this task requires a third-party integration to complete.",
    )
    approval_layers: int = Field(
        default=0,
        ge=0,
        le=3,
        description="Number of approval steps required (0-3).",
    )


class SimulationAssumptions(BaseModel):
    """
    Behavioural assumptions applied uniformly across all tasks.

    Legacy fields kept for backward compat.
    v2 simplified aliases are customer_delay_days / internal_delay_days and
    default to the legacy values when not provided explicitly.
    """

    avg_customer_delay_days: float = Field(default=1.0, ge=0)
    avg_internal_delay_days: float = Field(default=0.5, ge=0)
    setup_data_delay_days: float = Field(default=0.0, ge=0)

    # v2 simplified aliases — callers can use either name, values mirror above
    customer_delay_days: float | None = Field(
        default=None,
        ge=0,
        description="Alias for avg_customer_delay_days. Takes precedence if provided.",
    )
    internal_delay_days: float | None = Field(
        default=None,
        ge=0,
        description="Alias for avg_internal_delay_days. Takes precedence if provided.",
    )

    def effective_customer_delay(self) -> float:
        return self.customer_delay_days if self.customer_delay_days is not None else self.avg_customer_delay_days

    def effective_internal_delay(self) -> float:
        return self.internal_delay_days if self.internal_delay_days is not None else self.avg_internal_delay_days


class SimulationRequest(BaseModel):
    """Fully ad-hoc simulation payload (no existing project required)."""

    customer_type: str = Field(..., description="smb or enterprise")
    tasks: list[SimulationTaskInput]
    assumptions: SimulationAssumptions = Field(default_factory=SimulationAssumptions)


class ProjectBaselineResponse(BaseModel):
    """Simulation baseline for a real project: customer_type + tasks (for compare or display)."""

    customer_type: str = Field(..., description="Project's customer segment.")
    tasks: list[SimulationTaskInput] = Field(..., description="Project tasks as simulation input.")


# ---------------------------------------------------------------------------
# v2 per-task assessment models
# ---------------------------------------------------------------------------


class TaskAssessment(BaseModel):
    """Per-task decision-support assessment produced by v2 scoring engine."""

    task_title: str
    stage: OnboardingStage

    # Raw driver scores (0-100 each)
    slack_risk_score: float = Field(..., description="Risk score from deadline slack analysis.")
    external_dependency_score: float = Field(..., description="Risk from customer/external dependency.")
    dependency_chain_score: float = Field(..., description="Risk from predecessor task chain depth.")
    complexity_score: float = Field(..., description="Risk from integration, setup-data, and approval layers.")

    # Composite scores
    risk_score: float = Field(..., description="Weighted composite risk score (0-100).")
    risk_band: str = Field(..., description="Low | Guarded | Elevated | Critical")
    urgency_score: float = Field(..., description="Score based on how soon the deadline is.")
    criticality_score: float = Field(..., description="Score based on business impact (from criticality 1-4).")
    action_priority_score: float = Field(
        ...,
        description="Combined queue-ordering score: 0.50*risk + 0.30*urgency + 0.20*criticality.",
    )

    # Explainability
    top_reasons: list[str] = Field(
        default_factory=list,
        max_length=3,
        description="Top 3 human-readable reasons driving the risk score.",
    )
    recommended_fallback: str = Field(
        ...,
        description="Single highest-impact mitigation action for this task.",
    )


# ---------------------------------------------------------------------------
# Ephemeral sandbox inbox models
# ---------------------------------------------------------------------------


class VirtualInboxMessage(BaseModel):
    """One message event in an ephemeral virtual inbox."""

    day: float = Field(..., description="Simulated calendar day from project start.")
    event_type: str = Field(
        ...,
        description=(
            "email_sent | awaiting_reply | reply_received | "
            "deadline_warning | deadline_missed | reminder_sent"
        ),
    )
    subject: str
    body_preview: str
    task_title: str | None = None
    risk_band: str | None = Field(
        default=None,
        description="Risk band of the task this message relates to, if applicable.",
    )


class VirtualInboxPreview(BaseModel):
    """Ephemeral two-sided inbox produced per simulation run."""

    sender_label: str = Field(
        ...,
        description="Label for the outgoing side (e.g. 'Your Company (CSM)').",
    )
    recipient_label: str = Field(
        ...,
        description="Label for the receiving side (e.g. 'Company ABC (Customer)').",
    )
    sent_messages: list[VirtualInboxMessage] = Field(
        default_factory=list,
        description="Messages sent outbound.",
    )
    received_messages: list[VirtualInboxMessage] = Field(
        default_factory=list,
        description="Simulated replies / inbound messages.",
    )


# ---------------------------------------------------------------------------
# Legacy response models (unchanged — backward compat)
# ---------------------------------------------------------------------------


class SimulationRiskSignal(BaseModel):
    """A single detected risk trigger within the simulation."""

    rule: str = Field(
        ...,
        description="Machine-readable rule ID (overdue_threshold | stalled | multi_overdue)",
    )
    stage: OnboardingStage
    task_title: str | None = None
    detail: str = Field(..., description="Human-readable explanation.")


class SimulationStageResult(BaseModel):
    """Per-stage simulation output."""

    stage: OnboardingStage
    total_tasks: int
    required_tasks: int
    customer_required_tasks: int
    setup_data_tasks: int
    projected_duration_days: float = Field(
        ...,
        description="Projected calendar days for this stage to complete under given assumptions.",
    )
    blocker_tasks: list[str] = Field(default_factory=list)
    overdue_tasks: list[str] = Field(default_factory=list)
    can_advance: bool
    gate_blocked_reason: str | None = None


class SimulationResponse(BaseModel):
    """Top-level stateless simulation result — v2 adds task_assessments and inbox_preview."""

    customer_type: str
    total_tasks: int
    stages_simulated: int

    projected_ttfv_days: float
    projected_total_days: float

    at_risk: bool
    risk_signals: list[SimulationRiskSignal]
    stage_results: list[SimulationStageResult]
    recommendations: list[str] = Field(default_factory=list)
    summary: str

    # v2 additions — absent when no tasks provided (empty list = no-op for clients)
    task_assessments: list[TaskAssessment] = Field(
        default_factory=list,
        description="Per-task v2 risk/urgency/criticality assessments.",
    )
    inbox_preview: VirtualInboxPreview | None = Field(
        default=None,
        description="Ephemeral sandbox inbox preview derived from simulation results.",
    )


# ---------------------------------------------------------------------------
# Branch comparison models
# ---------------------------------------------------------------------------


class BranchScenarioRequest(BaseModel):
    """
    A single scenario variant to compare against the baseline.

    assumptions_override and task_overrides are merged on top of the
    baseline at runtime; unset fields fall through to baseline values.
    """

    name: str = Field(..., min_length=1, max_length=80, description="Human label, e.g. 'slow-customer'.")
    assumptions_override: SimulationAssumptions | None = None
    task_overrides: list[SimulationTaskInput] = Field(
        default_factory=list,
        description=(
            "Replace specific tasks by title match. Tasks not listed keep their baseline definition. "
            "Use to test e.g. 'what if we start the doc request 2 days earlier?'"
        ),
    )


class BranchScenarioResult(BaseModel):
    """A named branch simulation result."""

    name: str
    result: SimulationResponse


class ComparisonSummary(BaseModel):
    """Delta summary between baseline and one branch."""

    branch_name: str
    risk_score_delta: float = Field(
        ...,
        description="Average per-task risk score change vs baseline (negative = improvement).",
    )
    ttfv_delta_days: float = Field(
        ...,
        description="Projected TTFV change vs baseline in days (negative = faster).",
    )
    total_duration_delta_days: float = Field(
        ...,
        description="Projected total onboarding duration change vs baseline (negative = faster).",
    )
    at_risk_changed: bool = Field(
        ...,
        description="Whether the overall at_risk flag differs from baseline.",
    )
    risk_signal_delta: int = Field(
        ...,
        description="Change in number of risk signals vs baseline (negative = fewer signals).",
    )
    top_improvements: list[str] = Field(
        default_factory=list,
        description="Up to 3 reasons the branch is better (or worse) than baseline.",
    )


class SimulationCompareRequest(BaseModel):
    """Request body for the /simulations/risk/compare endpoint."""

    customer_type: str = Field(..., description="smb or enterprise")
    baseline_tasks: list[SimulationTaskInput]
    baseline_assumptions: SimulationAssumptions = Field(default_factory=SimulationAssumptions)
    branches: list[BranchScenarioRequest] = Field(
        ...,
        min_length=1,
        description="One or more scenario branches to compare against the baseline.",
    )


class SimulationCompareResponse(BaseModel):
    """Top-level compare response with baseline + all branches + delta summaries."""

    customer_type: str
    baseline: SimulationResponse
    branches: list[BranchScenarioResult]
    comparisons: list[ComparisonSummary]
    overall_recommendation: str = Field(
        ...,
        description="Top-level guidance on which branch minimises risk most.",
    )
