"""Search agent — gathers web information via tools."""

from __future__ import annotations

import json

from langchain.agents import create_agent
from langchain_core.messages import HumanMessage

from research_agent.config import get_llm
from research_agent.state import ResearchState
from research_agent.tools.web_fetch import web_fetch
from research_agent.tools.web_search import web_search
from research_agent.utils import (
    build_ai_message,
    get_last_message_content,
    invoke_with_retry,
    parse_search_results,
)

SEARCH_PROMPT = """You are a research search agent.

Your job:
1. Use web_search to find relevant sources for the topic.
2. Use web_fetch on the most promising URLs to read content.
3. Return a JSON array of findings. Each item must include: title, url, snippet, and key_points (list of strings).

Return ONLY valid JSON in your final message — no markdown fences."""

_search_agent = None


def _get_search_agent():
    global _search_agent
    if _search_agent is None:
        _search_agent = create_agent(
            model=get_llm(),
            tools=[web_search, web_fetch],
            system_prompt=SEARCH_PROMPT,
        )
    return _search_agent


def search_node(state: ResearchState) -> dict:
    topic = state["topic"]
    prompt = (
        f"Research this topic thoroughly:\n\n{topic}\n\n"
        "Search the web, fetch useful pages, and return JSON findings."
    )

    def _run():
        return _get_search_agent().invoke({"messages": [HumanMessage(content=prompt)]})

    result = invoke_with_retry(_run)
    step_count = state["step_count"] + 1

    if result is None:
        return {
            "search_results": state.get("search_results", []),
            "messages": [build_ai_message("Search agent failed after retries.")],
            "step_count": step_count,
        }

    content = get_last_message_content(result["messages"])
    search_results = parse_search_results(content)

    return {
        "search_results": search_results,
        "messages": [build_ai_message(f"Search completed with {len(search_results)} result(s).")],
        "step_count": step_count,
    }


def reset_search_agent() -> None:
    global _search_agent
    _search_agent = None
