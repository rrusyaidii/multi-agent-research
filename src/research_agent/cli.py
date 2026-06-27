"""CLI entry point for the research agent."""

from __future__ import annotations

import argparse
import json
import logging
import sys
from research_agent.config import get_settings
from research_agent.graph import close_checkpointer
from research_agent.service import (
    build_pipeline_steps,
    generate_thread_id,
    start_research,
    wait_for_job,
)


def _configure_logging() -> None:
    settings = get_settings()
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(levelname)s %(name)s: %(message)s",
    )


def run_research(topic: str, thread_id: str, output_format: str = "markdown") -> int:
    print(f"→ Starting research: {topic}", file=sys.stderr)
    print(f"→ Thread ID: {thread_id}", file=sys.stderr)

    start_research(topic, thread_id)
    job = wait_for_job(thread_id)

    if job.status == "failed":
        print(f"Error: {job.error or 'Research failed.'}", file=sys.stderr)
        return 1

    report = job.report
    if not report:
        print("Warning: No report generated.", file=sys.stderr)
        return 1

    print(f"→ Report saved to reports/{thread_id}.md", file=sys.stderr)

    if output_format == "json":
        payload = {
            "topic": topic,
            "thread_id": thread_id,
            "steps": build_pipeline_steps(job.executed_nodes, None, "completed"),
            "report": report,
            "search_results": job.search_results,
            "analysis": job.analysis,
        }
        print(json.dumps(payload, indent=2))
    else:
        print(report)

    return 0


def main(argv: list[str] | None = None) -> int:
    _configure_logging()

    parser = argparse.ArgumentParser(
        description="Multi-agent research and report generator",
    )
    parser.add_argument("topic", help="Research topic or question")
    parser.add_argument(
        "--thread-id",
        default=generate_thread_id(),
        help="Session thread ID for checkpoint continuity",
    )
    parser.add_argument(
        "--format",
        choices=["markdown", "json"],
        default="markdown",
        dest="output_format",
        help="Output format (default: markdown)",
    )

    args = parser.parse_args(argv)

    try:
        return run_research(args.topic, args.thread_id, args.output_format)
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("\nInterrupted.", file=sys.stderr)
        return 130
    finally:
        close_checkpointer()


if __name__ == "__main__":
    raise SystemExit(main())
