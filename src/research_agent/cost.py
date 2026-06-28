"""Transparent MYR cost estimates for session budgeting."""

from __future__ import annotations

from research_agent.config import get_settings


def estimate_session_cost_myr(step_count: int, cost_per_call: float | None = None) -> float:
    """Estimate session spend from LLM call count (not token-level billing)."""
    settings = get_settings()
    per_call = cost_per_call if cost_per_call is not None else settings.estimated_cost_per_llm_call_myr
    return round(max(step_count, 0) * per_call, 4)


def is_budget_exceeded(step_count: int, max_cost_myr: float | None = None) -> bool:
    """Return True when estimated session cost meets or exceeds the cap."""
    settings = get_settings()
    cap = max_cost_myr if max_cost_myr is not None else settings.max_cost_per_session_myr
    if cap <= 0:
        return False
    return estimate_session_cost_myr(step_count) >= cap
