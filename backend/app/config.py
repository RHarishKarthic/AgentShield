"""
AgentShield Configuration Module.

Centralises all application settings using pydantic-settings.
Settings are loaded from environment variables and .env files,
ensuring secrets never appear in source code.

WHY pydantic-settings:
- Type-safe configuration with validation
- Automatic .env file loading
- Clear documentation of every setting via field descriptions
- Fails fast on startup if required settings are missing
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Application ---
    app_name: str = Field(default="AgentShield", description="Application name")
    app_env: Literal["development", "staging", "production"] = Field(
        default="development", description="Runtime environment"
    )
    debug: bool = Field(default=False, description="Enable debug mode")
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(
        default="INFO", description="Logging level"
    )

    # --- API Security ---
    api_secret_key: str = Field(
        default="change-me-to-a-strong-random-secret",
        description="Secret key for JWT/session signing",
    )
    waf_api_key: str = Field(
        default="change-me-to-a-strong-api-key",
        description="API key for authenticating agents to the WAF",
    )

    # --- PostgreSQL ---
    postgres_host: str = Field(default="localhost", description="PostgreSQL host")
    postgres_port: int = Field(default=5432, description="PostgreSQL port")
    postgres_db: str = Field(default="agentshield", description="PostgreSQL database name")
    postgres_user: str = Field(default="agentshield", description="PostgreSQL username")
    postgres_password: str = Field(default="agentshield", description="PostgreSQL password")

    @property
    def database_url(self) -> str:
        """Construct async PostgreSQL connection URL."""
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def database_url_sync(self) -> str:
        """Construct sync PostgreSQL URL (for Alembic migrations)."""
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # --- Redis ---
    redis_host: str = Field(default="localhost", description="Redis host")
    redis_port: int = Field(default=6379, description="Redis port")
    redis_password: str = Field(default="", description="Redis password (empty if none)")
    redis_db: int = Field(default=0, description="Redis database number")

    @property
    def redis_url(self) -> str:
        """Construct Redis connection URL."""
        if self.redis_password:
            return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/{self.redis_db}"
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"

    # --- Tool Services ---
    customer_service_url: str = Field(
        default="http://localhost:8001",
        description="Customer Database service URL",
    )
    email_service_url: str = Field(
        default="http://localhost:8002",
        description="Email Service URL",
    )
    file_service_url: str = Field(
        default="http://localhost:8003",
        description="File Storage Service URL",
    )

    # --- LLM ---
    llm_provider: Literal["ollama", "openai", "anthropic"] = Field(default="ollama", description="LLM provider to use")
    ollama_base_url: str = Field(default="http://localhost:11434", description="Ollama server URL")
    ollama_model: str = Field(default="llama3.2", description="Ollama model name")
    openai_api_key: str = Field(default="", description="OpenAI API key")
    openai_model: str = Field(default="gpt-4o-mini", description="OpenAI model name")
    anthropic_api_key: str = Field(default="", description="Anthropic API key")
    anthropic_model: str = Field(default="claude-sonnet-4-20250514", description="Anthropic model name")

    # --- CORS ---
    cors_origins: str = Field(
        default="http://localhost:5173,http://localhost:3000",
        description="Comma-separated list of allowed CORS origins",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins into a list."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    # --- Server ---
    backend_host: str = Field(default="0.0.0.0", description="Backend bind host")
    backend_port: int = Field(default=8000, description="Backend bind port")


@lru_cache
def get_settings() -> Settings:
    """
    Get cached application settings.

    Uses @lru_cache so settings are loaded once and reused
    across the application lifecycle.
    """
    return Settings()
