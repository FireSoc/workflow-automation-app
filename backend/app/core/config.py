from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Agile"
    app_version: str = "0.1.0"
    # Local dev default; set DATABASE_URL in production.
    database_url: str = "postgresql://agile:agile@localhost:5432/agile"

    # Risk detection thresholds
    risk_overdue_threshold_days: int = 3
    risk_stalled_threshold_days: int = 7
    risk_required_overdue_count: int = 2

    # OpenAI (AI summary / simulation recommendations)
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    openai_timeout_seconds: float = 10.0

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
