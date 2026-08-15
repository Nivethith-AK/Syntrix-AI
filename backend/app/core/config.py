"""Application settings loaded from environment variables."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: Literal["development", "staging", "production"] = "development"
    app_name: str = "Syntrix AI"
    api_host: str = "localhost"
    api_port: int = 8000
    log_level: str = "INFO"

    frontend_origin: str = "http://localhost:3000"
    cors_origins: str = "http://localhost:3000"

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""
    database_url: str = ""

    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    ai_provider: str = "ollama"
    ai_base_url: str = "http://localhost:11434"
    ai_model: str = "llama3.2"
    embedding_model: str = "nomic-embed-text"
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"

    storage_bucket_datasets: str = "datasets"
    storage_bucket_models: str = "models"
    storage_bucket_reports: str = "reports"

    # Phase 2 upload limits (100 MiB demo default; align with Storage bucket)
    upload_max_bytes: int = 104_857_600
    upload_preview_rows: int = 50
    upload_allowed_extensions: str = "csv,parquet,xlsx,xls"

    # Resend — optional in Phase 1. Prefer Supabase Auth custom SMTP for auth emails.
    # App-level transactional sends can use these later; leave blank until configured.
    resend_api_key: str = ""
    resend_from_email: str = ""

    mlflow_tracking_uri: str = "http://localhost:5000"

    default_page_limit: int = 20
    max_page_limit: int = 100

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _strip_cors(cls, value: object) -> object:
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        origins = [o.strip() for o in self.cors_origins.split(",") if o.strip()]
        if self.frontend_origin and self.frontend_origin not in origins:
            origins.append(self.frontend_origin)
        return origins

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def async_database_url(self) -> str:
        url = self.database_url
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        return url

    def require_runtime_secrets(self) -> None:
        missing = [
            name
            for name, value in [
                ("DATABASE_URL", self.database_url),
                ("SUPABASE_JWT_SECRET", self.supabase_jwt_secret),
            ]
            if not value
        ]
        if missing and self.is_production:
            raise RuntimeError(f"Missing required settings: {', '.join(missing)}")


@lru_cache
def get_settings() -> Settings:
    return Settings()
