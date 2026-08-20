"""
AI Agent Configuration.

Loads settings for LLM provider, AgentShield WAF gateway, and agent identity.
"""

from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AgentConfig(BaseSettings):
    """Configuration for autonomous agent runtime."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Agent Identity ---
    agent_id: str = Field(default="support-agent", description="Agent identifier registered with AgentShield")
    agent_api_key: str = Field(default="agent-key-support-001", description="Agent secret API key")

    # --- WAF Gateway ---
    waf_gateway_url: str = Field(
        default="http://localhost:8000/api/v1/waf/intercept",
        description="AgentShield WAF intercept endpoint URL",
    )

    # --- LLM Provider ---
    llm_provider: Literal["ollama", "openai", "groq", "mock"] = Field(
        default="ollama",
        description="Active LLM provider: 'ollama', 'openai', 'groq', or 'mock'. Note: 'anthropic' is not yet implemented.",
    )

    # Ollama settings (Local development)
    ollama_base_url: str = Field(default="http://localhost:11434", description="Ollama API URL")
    ollama_model: str = Field(default="llama3.2", description="Ollama model name")

    # OpenAI settings (Production)
    openai_api_key: str = Field(default="", description="OpenAI API Key")
    openai_model: str = Field(default="gpt-4o-mini", description="OpenAI model")
    openai_base_url: str = Field(default="https://api.openai.com/v1", description="OpenAI API Base URL")

    # Anthropic settings
    anthropic_api_key: str = Field(default="", description="Anthropic API Key")
    anthropic_model: str = Field(default="claude-3-5-sonnet-20241022", description="Anthropic model")


config = AgentConfig()
