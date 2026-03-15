import enum


class CustomerType(str, enum.Enum):
    SMB = "smb"
    MID_MARKET = "mid_market"
    ENTERPRISE = "enterprise"


# Segment aligns with customer type for onboarding playbook selection.
Segment = CustomerType


class OnboardingStage(str, enum.Enum):
    KICKOFF = "kickoff"
    SETUP = "setup"
    INTEGRATION = "integration"
    TRAINING = "training"
    GO_LIVE = "go_live"


class ProjectStatus(str, enum.Enum):
    ACTIVE = "active"
    AT_RISK = "at_risk"
    BLOCKED = "blocked"
    COMPLETED = "completed"


class TaskStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    OVERDUE = "overdue"
    BLOCKED = "blocked"


class DealStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"


class RiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class TaskType(str, enum.Enum):
    INTERNAL = "internal"
    CUSTOMER = "customer"


class EventType(str, enum.Enum):
    DEAL_INGESTED = "deal_ingested"
    PROJECT_CREATED = "project_created"
    PLAYBOOK_SELECTED = "playbook_selected"
    TASKS_GENERATED = "tasks_generated"
    TASK_COMPLETED = "task_completed"
    PROJECT_ADVANCED = "project_advanced"
    REMINDER_TRIGGERED = "reminder_triggered"
    RISK_FLAG_ADDED = "risk_flag_added"
    RISK_FLAG_CLEARED = "risk_flag_cleared"
    RISK_SCORE_CHANGED = "risk_score_changed"
    PROJECT_COMPLETED = "project_completed"
    STAGE_BLOCKED = "stage_blocked"
    BLOCKER_DETECTED = "blocker_detected"
    STAGE_DELAYED = "stage_delayed"
    ESCALATION_TRIGGERED = "escalation_triggered"


class RecommendationActionType(str, enum.Enum):
    REMIND_CUSTOMER_ADMIN = "remind_customer_admin"
    ESCALATE_BLOCKER = "escalate_blocker"
    RESCHEDULE_TRAINING = "reschedule_training"
    SHIFT_PROJECTED_GO_LIVE = "shift_projected_go_live"
    ASSIGN_TECHNICAL_SPECIALIST = "assign_technical_specialist"


# Ordered stage progression for look-up.
STAGE_ORDER: list[OnboardingStage] = [
    OnboardingStage.KICKOFF,
    OnboardingStage.SETUP,
    OnboardingStage.INTEGRATION,
    OnboardingStage.TRAINING,
    OnboardingStage.GO_LIVE,
]
