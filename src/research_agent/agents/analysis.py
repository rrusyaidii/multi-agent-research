"""Analysis agent — summarises search results."""

from __future__ import annotations

import json

from langchain.agents import create_agent
from langchain_core.messages import HumanMessage

from research_agent.config import get_llm
from research_agent.state import ResearchState
from research_agent.utils import build_ai_message, get_last_message_content, invoke_with_retry

ANALYSIS_PROMPT = """You are a research analyst. Do NOT merely summarise — analyse and compare.

Your output must include these sections (use plain headings):

1. Entities Identified — list the specific products, providers, or options found
2. Comparison Dimensions — what criteria matter for this topic (price, features, support, etc.)
3. Comparison — pros and cons for each entity on each dimension
4. Ranking — rank the top options with clear rationale for the reader's use case
5. Data Gaps — what was NOT found in sources; do not invent missing data
6. Recommendation — your #1 pick and who it is best for

Rules:
- Compare at least 3 entities when the topic involves choices (hosting, tools, products, etc.)
- Use only facts from the search results provided
- Write clear plain prose — no **bold** or *italic* markdown
- Be specific: names, numbers, and source references where available

Do not use tools."""

_analysis_agent = None


def _get_analysis_agent():
    global _analysis_agent
    if _analysis_agent is None:
        _analysis_agent = create_agent(
            model=get_llm(),
            tools=[],
            system_prompt=ANALYSIS_PROMPT,
        )
    return _analysis_agent


def analysis_node(state: ResearchState) -> dict:
    topic = state["topic"]
    search_results = state.get("search_results", [])
    payload = json.dumps(search_results, indent=2) if search_results else "[]"

    prompt = (
        f"Topic: {topic}\n\n"
        f"Search results:\n{payload}\n\n"
        "Produce a structured analyst brief with comparison, ranking, and recommendation. "
        "If this topic involves choosing between options, compare at least 3 entities."
    )

    def _run():
        return _get_analysis_agent().invoke({"messages": [HumanMessage(content=prompt)]})

    result = invoke_with_retry(_run)
    step_count = state["step_count"] + 1

    if result is None:
        return {
            "analysis": state.get("analysis", ""),
            "messages": [build_ai_message("Analysis agent failed after retries.")],
            "step_count": step_count,
        }

    analysis = get_last_message_content(result["messages"])

    return {
        "analysis": analysis,
        "messages": [build_ai_message("Analysis completed.")],
        "step_count": step_count,
    }


def reset_analysis_agent() -> None:
    global _analysis_agent
    _analysis_agent = None
