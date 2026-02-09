from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Environment
    env: str = "local"
    log_level: str = "INFO"
    cors_allow_origins: str = "http://localhost:3000"

    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # AI APIs
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    google_api_key: str = ""

    # Default AI settings
    default_ai_provider: str = "gemini"
    default_ai_model: str = "gemini-2.5-flash"

    # SMTP (email)
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_from: str = ""
    smtp_password: str = ""

    # Clerk
    clerk_secret_key: str = ""
    clerk_publishable_key: str = ""

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
