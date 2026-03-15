from pathlib import Path

from pydantic_settings import BaseSettings

# Resolve DB path relative to backend/ so the same file is used regardless of cwd.
_backend_dir = Path(__file__).resolve().parent.parent.parent
_default_db_url = f"sqlite:///{_backend_dir / 'agile.db'}"


class Settings(BaseSettings):
    app_name: str = "Agile"
    app_version: str = "0.1.0"
    database_url: str = _default_db_url

    # Risk detection thresholds
    risk_overdue_threshold_days: int = 3
    risk_stalled_threshold_days: int = 7
    risk_required_overdue_count: int = 2

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
