from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import OnboardingStage, ProjectStatus, RiskLevel
from app.schemas.onboarding_event import OnboardingEventRead
from app.schemas.recommendation import RecommendationRead
from app.schemas.risk_signal import RiskSignalRead
from app.schemas.task import TaskRead


class ProjectCreate(BaseModel):
    customer_id: int
    name: str | None = None
    notes: str | None = None


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    source_deal_id: int | None
    playbook_id: int | None
    name: str | None
    current_stage: OnboardingStage
    status: ProjectStatus
    risk_flag: bool
    risk_score: int | None
    risk_level: RiskLevel | None
    kickoff_date: datetime | None
    target_go_live_date: datetime | None
    projected_go_live_date: datetime | None
    health_summary: str | None
    next_best_action: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class ProjectDetail(ProjectRead):
    tasks: list[TaskRead] = []
    events: list[OnboardingEventRead] = []
    risk_signals: list[RiskSignalRead] = []
    recommendations: list[RecommendationRead] = []


class OverdueCheckResponse(BaseModel):
    overdue_count: int
    reminder_events_created: int
    message: str


class RiskCheckResponse(BaseModel):
    risk_flag: bool
    was_already_flagged: bool
    reason: str | None
    message: str


class RiskRead(BaseModel):
    """Explainable risk for a project (GET /projects/{id}/risk)."""

    risk_score: int
    risk_level: RiskLevel
    risk_flag: bool
    explanations: list[str]


class ProjectSummaryResponse(BaseModel):
    """AI-assisted summary of project state (GET /projects/{id}/summary)."""

    what_is_complete: str
    what_is_blocked: str
    why_risk_elevated: str
    what_happens_next: str
    go_live_realistic: str


class CustomerPortalProjectView(BaseModel):
    """Customer-facing project view: no internal risk notes or recommendations."""

    id: int
    company_name: str
    current_stage: OnboardingStage
    status: ProjectStatus
    target_go_live_date: datetime | None
    projected_go_live_date: datetime | None
    kickoff_date: datetime | None
    tasks: list[TaskRead] = []
    next_steps: str = ""
    milestones: list[str] = []
