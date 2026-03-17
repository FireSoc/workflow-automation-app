from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    """Create all tables on startup (onboarding_playbooks, crm_deals, onboarding_events, etc.)."""
    from app.db.base import Base  # noqa: F401
    import app.models  # noqa: F401  registers all models with Base.metadata

    Base.metadata.create_all(bind=engine)
