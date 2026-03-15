# Import all models so SQLAlchemy Base.metadata is fully populated.
from app.models.crm_deal import CRMDeal  # noqa: F401
from app.models.customer import Customer  # noqa: F401
from app.models.enums import (  # noqa: F401
    CustomerType,
    DealStatus,
    EventType,
    OnboardingStage,
    ProjectStatus,
    RecommendationActionType,
    RiskLevel,
    STAGE_ORDER,
    TaskStatus,
    TaskType,
)
from app.models.onboarding_event import OnboardingEvent  # noqa: F401
from app.models.onboarding_playbook import OnboardingPlaybook  # noqa: F401
from app.models.onboarding_project import OnboardingProject  # noqa: F401
from app.models.recommendation import Recommendation  # noqa: F401
from app.models.risk_signal import RiskSignal  # noqa: F401
from app.models.task import Task  # noqa: F401
