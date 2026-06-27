"""Shared research job runner for CLI and API."""

from __future__ import annotations

import logging
import threading
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

from research_agent.config import get_settings
from research_agent.graph import compile_graph
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
JobStatus = Literal["running", "completed", "failed"]


class JobConflictError(Exception):
    """Raised when a thread_id is already running."""


@dataclass
class JobRecord:
    thread_id: str
    topic: str
    status: JobStatus
    executed_nodes: list[str] = field(default_factory=list)
    current_node: str | None = None
    report: str = ""
    analysis: str = ""
    search_results: list[dict[str, Any]] = field(default_factory=list)
    error: str | None = None


class JobStore:
    def __init__(self) -> None:
        self._jobs: dict[str, JobRecord] = {}
        self._lock = threading.Lock()

    def get(self, thread_id: str) -> JobRecord | None:
        with self._lock:
            job = self._jobs.get(thread_id)
            if job is None:
                return None
            return JobRecord(
                thread_id=job.thread_id,
                topic=job.topic,
                status=job.status,
                executed_nodes=list(job.executed_nodes),
                current_node=job.current_node,
                report=job.report,
                analysis=job.analysis,
                search_results=list(job.search_results),
                error=job.error,
            )

    def is_running(self, thread_id: str) -> bool:
        with self._lock:
            job = self._jobs.get(thread_id)
            return job is not None and job.status == "running"

    def _set(self, job: JobRecord) -> None:
        with self._lock:
            self._jobs[job.thread_id] = job

    def _update(self, thread_id: str, **kwargs: Any) -> None:
        with self._lock:
            job = self._jobs[thread_id]
            for key, value in kwargs.items():
                setattr(job, key, value)


_job_store = JobStore()
_graph_app = None
_graph_lock = threading.Lock()


def _get_graph():
    global _graph_app
    with _graph_lock:
        if _graph_app is None:
            _graph_app = compile_graph()
        return _graph_app


def generate_thread_id() -> str:
    return f"research-{uuid.uuid4().hex[:8]}"


def save_report(thread_id: str, report: str) -> Path:
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    path = REPORTS_DIR / f"{thread_id}.md"
    path.write_text(report, encoding="utf-8")
    return path


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
        elif agent == current_node:
            status = "active"
        elif agent in executed_set and agent != current_node:
            status = "done"
        elif agent == "finish" and job_status == "running" and "writer" in executed_set and current_node != "writer":
            status = "active"
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

    try:
        for chunk in app.stream(state, config=config, stream_mode="updates"):
            for node_name, update in chunk.items():
                current_job = _job_store.get(thread_id)
                if current_job is None:
                    return

                executed = list(current_job.executed_nodes)
                executed.append(node_name)

                merged = final_state
                if isinstance(update, dict):
                    merged = {**final_state, **update}
                    final_state = merged

                _job_store._update(
                    thread_id,
                    executed_nodes=executed,
                    current_node=node_name,
                    report=str(merged.get("report", "")),
                    analysis=str(merged.get("analysis", "")),
                    search_results=list(merged.get("search_results", [])),
                )
                logger.info("Job %s: node %s completed", thread_id, node_name)

        result = app.get_state(config)
        if result and result.values:
            final_state = dict(result.values)

        report = str(final_state.get("report", ""))
        if not report:
            _job_store._update(
                thread_id,
                status="failed",
                current_node=None,
                error="No report was generated.",
            )
            return

        save_report(thread_id, report)
        _job_store._update(
            thread_id,
            status="completed",
            current_node=None,
            report=report,
            analysis=str(final_state.get("analysis", "")),
            search_results=list(final_state.get("search_results", [])),
            error=None,
        )
        logger.info("Job %s: completed", thread_id)

    except Exception as exc:  # noqa: BLE001 - job boundary
        logger.exception("Job %s failed", thread_id)
        _job_store._update(
            thread_id,
            status="failed",
            current_node=None,
            error=str(exc),
        )


def start_research(topic: str, thread_id: str | None = None) -> JobRecord:
    tid = thread_id or generate_thread_id()

    if _job_store.is_running(tid):
        raise JobConflictError(f"Research job already running for thread_id={tid}")

    job = JobRecord(thread_id=tid, topic=topic, status="running")
    _job_store._set(job)

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
        if job.status in ("completed", "failed"):
            return job
        time.sleep(poll_interval)


def get_job(thread_id: str) -> JobRecord | None:
    return _job_store.get(thread_id)


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
    }
