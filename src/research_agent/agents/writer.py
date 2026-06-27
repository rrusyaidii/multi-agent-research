"""Writer agent — compiles the final markdown report."""

from __future__ import annotations

from pathlib import Path

from jinja2 import Template
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage

from research_agent.config import get_llm
from research_agent.state import ResearchState
from research_agent.utils import (
    build_ai_message,
    get_last_message_content,
    invoke_with_retry,
    normalize_report_markdown,
)

WRITER_PROMPT = """You are a report writer agent.

Compile research analysis into a polished markdown report with:
- A descriptive title (# heading)
- Executive Summary (##)
- Key Findings (## with ### subsections)
- Recommendations (## with plain - bullet list)

Formatting rules (strict):
- Do NOT use inline **bold** or *italic* markdown
- Use ### subheadings instead of bold labels
- Use plain bullet lists: "- Label: description" (no asterisks for emphasis)
- Use only information from the analysis provided

Example list item:
- Model (LLM): The central processing unit for reasoning and planning.

Write in clear, professional prose."""

TEMPLATE_PATH = Path(__file__).resolve().parent.parent / "templates" / "report.md.j2"

_writer_agent = None


def _get_writer_agent():
    global _writer_agent
    if _writer_agent is None:
        _writer_agent = create_agent(
            model=get_llm(),
            tools=[],
            system_prompt=WRITER_PROMPT,
        )
    return _writer_agent


def _fallback_report(topic: str, analysis: str) -> str:
    template = Template(TEMPLATE_PATH.read_text(encoding="utf-8"))
    report = template.render(
        title=topic,
        executive_summary=analysis[:500] if analysis else "Research incomplete.",
        findings=[{"title": "Summary", "body": analysis or "No analysis available."}],
        recommendations=["Review findings and run additional research if needed."],
    )
    return normalize_report_markdown(report)


def writer_node(state: ResearchState) -> dict:
    topic = state["topic"]
    analysis = state.get("analysis", "")

    prompt = (
        f"Topic: {topic}\n\n"
        f"Analysis:\n{analysis or 'No analysis available.'}\n\n"
        "Write the final markdown report."
    )

    def _run():
        return _get_writer_agent().invoke({"messages": [HumanMessage(content=prompt)]})

    result = invoke_with_retry(_run)
    step_count = state["step_count"] + 1

    if result is None:
        report = _fallback_report(topic, analysis)
        return {
            "report": report,
            "messages": [build_ai_message("Writer agent failed; partial report generated.")],
            "step_count": step_count,
        }

    raw_report = get_last_message_content(result["messages"]) or _fallback_report(topic, analysis)
    report = normalize_report_markdown(raw_report)

    return {
        "report": report,
        "messages": [build_ai_message("Report completed.")],
        "step_count": step_count,
    }


def reset_writer_agent() -> None:
    global _writer_agent
    _writer_agent = None
