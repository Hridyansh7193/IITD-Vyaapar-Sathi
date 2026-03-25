"""
config/settings.py
==================
Central configuration loaded from environment variables via pydantic-settings.
All secrets MUST be set in the .env file — never hardcoded here.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    # ── Application ──────────────────────────────────────────────────────────
    APP_NAME: str = "Vyaapar Mitra API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"

    # ── JWT / Auth ────────────────────────────────────────────────────────────
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite:///./vyaapar.db"

    # ── Supabase (for existing sales_data integration) ────────────────────────
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    # ── AI / OpenRouter ───────────────────────────────────────────────────────
    OPENROUTER_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    AI_MODEL: str = "google/gemini-2.0-flash-001"

    # ── Rate Limiting ─────────────────────────────────────────────────────────
    RATE_LIMIT_PER_MINUTE: int = 60

    # ── File Upload ───────────────────────────────────────────────────────────
    TMP_DIR: str = os.path.join(os.path.dirname(__file__), "..", "..", ".tmp")
    MAX_UPLOAD_SIZE_MB: int = 50

    # ── CORS ──────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: list[str] = ["*"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Returns a cached Settings instance — call this everywhere."""
    return Settings()
