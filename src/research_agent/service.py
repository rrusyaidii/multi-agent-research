"""Shared research job runner for CLI and API."""

from __future__ import annotations

import logging
import threading
import uuid
from pathlib import Path
from typing import Any, Literal

from research_agent.config import get_settings
from research_agent.graph import compile_graph
from research_agent.job_store import JobRecord, JobStatus, JobStore
from research_agent.state import initial_state

logger = logging.getLogger(__name__)

REPORTS_DIR = Path("reports")

AGENT_LABELS: dict[str, str] = {
    "supervisor": "Supervisor",
    "search": "Search",
    "analysis": "Analysis",
    "writer": "Writer",
    "finish": "Done",
}

PIPELINE_AGENTS: tuple[str, ...] = ("supervisor", "search", "analysis", "writer", "finish")

StepStatus = Literal["idle", "active", "done", "error"]


class JobConflictError(Exception):
    """Raised when a thread_id is already running."""


def _job_store_path() -> Path:
    return Path(get_settings().checkpointer_dir) / "jobs.db"


_job_store = JobStore(_job_store_path())
_job_store.hydrate_reports(REPORTS_DIR)
_graph_app = None
_graph_lock = threading.Lock()
_cancel_events: dict[str, threading.Event] = {}
_cancel_lock = threading.Lock()


def _get_graph():
    global _graph_app
    with _graph_lock:
        if _graph_app is None:
            _graph_app = compile_graph()
        return _graph_app


def _get_cancel_event(thread_id: str) -> threading.Event:
    with _cancel_lock:
        event = _cancel_events.get(thread_id)
        if event is None:
            event = threading.Event()
            _cancel_events[thread_id] = event
        return event


def _clear_cancel_event(thread_id: str) -> None:
    with _cancel_lock:
        _cancel_events.pop(thread_id, None)


def _mark_cancelled(thread_id: str) -> None:
    _job_store.update(
        thread_id,
        status="cancelled",
        current_node=None,
        error="Research was cancelled by the user.",
    )


def generate_thread_id() -> str:
    return f"research-{uuid.uuid4().hex[:8]}"


def save_report(thread_id: str, report: str) -> Path:
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    path = REPORTS_DIR / f"{thread_id}.md"
    path.write_text(report, encoding="utf-8")
    return path


def _resolve_display_node(completed_node: str, merged: dict[str, Any]) -> str:
    """Map a completed graph node to the agent currently running next."""
    if completed_node == "supervisor":
        next_agent = merged.get("next_agent", "FINISH")
        return "finish" if next_agent == "FINISH" else str(next_agent)

    if completed_node == "writer" and str(merged.get("report", "")).strip():
        return "finish"

    return "supervisor"


def build_pipeline_steps(
    executed_nodes: list[str],
    current_node: str | None,
    job_status: JobStatus | Literal["not_found"],
) -> list[dict[str, str]]:
    executed_set = set(executed_nodes)

    steps: list[dict[str, str]] = []
    for agent in PIPELINE_AGENTS:
        if job_status == "completed":
            status: StepStatus = "done"
        elif job_status == "failed" and agent == current_node:
            status = "error"
        elif job_status == "cancelled":
            status = "done" if agent in executed_set else "idle"
        elif agent == current_node:
            status = "active"
        elif agent in executed_set and agent != current_node:
            status = "done"
        else:
            status = "idle"

        steps.append(
            {
                "agent": agent,
                "status": status,
                "label": AGENT_LABELS[agent],
            }
        )

    return steps


def _run_job(thread_id: str) -> None:
    job = _job_store.get(thread_id)
    if job is None:
        return

    app = _get_graph()
    settings = get_settings()
    config = {"configurable": {"thread_id": thread_id}}
    state = initial_state(
        topic=job.topic,
        thread_id=thread_id,
        max_steps=settings.max_llm_calls,
    )

    final_state: dict[str, Any] = dict(state)
    cancel_event = _get_cancel_event(thread_id)

    try:
        for chunk in app.stream(state, config=config, stream_mode="updates"):
            if cancel_event.is_set():
                _mark_cancelled(thread_id)
                return

            for node_name, update in chunk.items():
                current_job = _job_store.get(thread_id)
                if current_job is None:
                    return
                if cancel_event.is_set() or current_job.status == "cancelled":
                    _mark_cancelled(thread_id)
                    return

                executed = list(current_job.executed_nodes)
                executed.append(node_name)

                merged = final_state
                if isinstance(update, dict):
                    merged = {**final_state, **update}
                    final_state = merged

                display_node = _resolve_display_node(node_name, merged)

                _job_store.update(
                    thread_id,
                    executed_nodes=executed,
                    current_node=display_node,
                    report=str(merged.get("report", "")),
                    analysis=str(merged.get("analysis", "")),
                    search_results=list(merged.get("search_results", [])),
                    step_count=int(merged.get("step_count", 0)),
                )
                logger.info("Job %s: node %s completed", thread_id, node_name)

        if cancel_event.is_set():
            _mark_cancelled(thread_id)
            return

        result = app.get_state(config)
        if result and result.values:
            final_state = dict(result.values)

        report = str(final_state.get("report", ""))
        if not report:
            _job_store.update(
                thread_id,
                status="failed",
                current_node=None,
                error="No report was generated.",
            )
            return

        report_path = save_report(thread_id, report)
        _job_store.update(
            thread_id,
            status="completed",
            current_node=None,
            report=report,
            report_path=str(report_path),
            analysis=str(final_state.get("analysis", "")),
            search_results=list(final_state.get("search_results", [])),
            step_count=int(final_state.get("step_count", 0)),
            error=None,
        )
        logger.info("Job %s: completed", thread_id)

    except Exception as exc:  # noqa: BLE001 - job boundary
        logger.exception("Job %s failed", thread_id)
        _job_store.update(
            thread_id,
            status="failed",
            current_node=None,
            error=str(exc),
        )
    finally:
        _clear_cancel_event(thread_id)


def start_research(topic: str, thread_id: str | None = None) -> JobRecord:
    tid = thread_id or generate_thread_id()

    if _job_store.is_running(tid):
        raise JobConflictError(f"Research job already running for thread_id={tid}")

    job = JobRecord(
        thread_id=tid,
        topic=topic,
        status="running",
        current_node="supervisor",
        max_steps=get_settings().max_llm_calls,
        max_cost=get_settings().max_cost_per_session,
    )
    _job_store.set(job)
    _get_cancel_event(tid).clear()

    thread = threading.Thread(target=_run_job, args=(tid,), daemon=True)
    thread.start()

    return _job_store.get(tid) or job


def wait_for_job(thread_id: str, poll_interval: float = 0.5) -> JobRecord:
    import time

    while True:
        job = _job_store.get(thread_id)
        if job is None:
            msg = f"Unknown thread_id: {thread_id}"
            raise KeyError(msg)
        if job.status in ("completed", "failed", "cancelled"):
            return job
        time.sleep(poll_interval)


def get_job(thread_id: str) -> JobRecord | None:
    return _job_store.get(thread_id)


def cancel_research(thread_id: str) -> JobRecord | None:
    job = _job_store.get(thread_id)
    if job is None:
        return None
    if job.status != "running":
        return job
    _get_cancel_event(thread_id).set()
    _mark_cancelled(thread_id)
    return _job_store.get(thread_id)


def list_jobs(limit: int = 20) -> list[JobRecord]:
    return _job_store.list_recent(limit=limit)


def build_history_payload(limit: int = 20) -> list[dict[str, Any]]:
    jobs = list_jobs(limit=limit)
    return [
        {
            "thread_id": job.thread_id,
            "topic": job.topic,
            "status": job.status,
            "created_at": job.created_at,
            "updated_at": job.updated_at,
            "has_report": bool(job.report),
            "error": job.error,
        }
        for job in jobs
    ]


def build_status_payload(thread_id: str) -> dict[str, Any] | None:
    job = _job_store.get(thread_id)
    if job is None:
        return None

    return {
        "thread_id": job.thread_id,
        "topic": job.topic,
        "status": job.status,
        "steps": build_pipeline_steps(job.executed_nodes, job.current_node, job.status),
        "report": job.report or None,
        "analysis": job.analysis or None,
        "error": job.error,
        "step_count": job.step_count,
        "max_steps": job.max_steps,
        "session_cost": job.session_cost,
        "max_cost": job.max_cost,
        "budget_exceeded": job.budget_exceeded,
    }
