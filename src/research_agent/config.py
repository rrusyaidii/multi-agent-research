"""Application configuration loaded from environment variables."""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
import os

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


@dataclass(frozen=True)
class Settings:
    llm_provider: str
    openrouter_api_key: str
    openrouter_model: str
    max_llm_calls: int
    max_tokens_per_call: int
    tool_timeout_seconds: float
    max_cost_per_session: float
    checkpointer_dir: str
    log_level: str


@lru_cache
def get_settings() -> Settings:
    return Settings(
        llm_provider=os.getenv("LLM_PROVIDER", "openrouter"),
        openrouter_api_key=os.getenv("OPENROUTER_API_KEY", ""),
        openrouter_model=os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash"),
        max_llm_calls=int(os.getenv("MAX_LLM_CALLS", "30")),
        max_tokens_per_call=int(os.getenv("MAX_TOKENS_PER_CALL", "2000")),
        tool_timeout_seconds=float(os.getenv("TOOL_TIMEOUT_SECONDS", "10")),
        max_cost_per_session=float(os.getenv("MAX_COST_PER_SESSION", "0.05")),
        checkpointer_dir=os.getenv("CHECKPOINTER_DIR", "./.checkpoints"),
        log_level=os.getenv("LOG_LEVEL", "INFO"),
    )


def get_llm() -> ChatOpenAI:
    settings = get_settings()
    if not settings.openrouter_api_key:
        msg = "OPENROUTER_API_KEY is not set. Copy .env.example to .env and add your key."
        raise ValueError(msg)

    return ChatOpenAI(
        model=settings.openrouter_model,
        api_key=settings.openrouter_api_key,
        base_url=OPENROUTER_BASE_URL,
        max_tokens=settings.max_tokens_per_call,
        temperature=0.2,
    )
