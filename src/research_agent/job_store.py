"""Persistent job metadata store for research sessions."""

from __future__ import annotations

import json
import sqlite3
import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

JobStatus = Literal["running", "completed", "failed", "cancelled"]


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
    report_path: str | None = None
    created_at: str = ""
    updated_at: str = ""
    step_count: int = 0
    max_steps: int = 0
    session_cost: float | None = None
    max_cost: float | None = None
    budget_exceeded: bool = False


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _json_dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def _json_loads_list(raw: str | None) -> list[Any]:
    if not raw:
        return []
    try:
        loaded = json.loads(raw)
    except json.JSONDecodeError:
        return []
    return loaded if isinstance(loaded, list) else []


class JobStore:
    """Thread-safe SQLite-backed job metadata store."""

    def __init__(self, db_path: Path) -> None:
        self.db_path = db_path
        self._lock = threading.RLock()
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS jobs (
                    thread_id TEXT PRIMARY KEY,
                    topic TEXT NOT NULL,
                    status TEXT NOT NULL,
                    executed_nodes TEXT NOT NULL DEFAULT '[]',
                    current_node TEXT,
                    report TEXT NOT NULL DEFAULT '',
                    analysis TEXT NOT NULL DEFAULT '',
                    search_results TEXT NOT NULL DEFAULT '[]',
                    error TEXT,
                    report_path TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    step_count INTEGER NOT NULL DEFAULT 0,
                    max_steps INTEGER NOT NULL DEFAULT 0,
                    session_cost REAL,
                    max_cost REAL,
                    budget_exceeded INTEGER NOT NULL DEFAULT 0
                )
                """
            )
            conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_updated_at ON jobs(updated_at DESC)")

    def _row_to_job(self, row: sqlite3.Row) -> JobRecord:
        return JobRecord(
            thread_id=str(row["thread_id"]),
            topic=str(row["topic"]),
            status=row["status"],
            executed_nodes=[str(item) for item in _json_loads_list(row["executed_nodes"])],
            current_node=row["current_node"],
            report=str(row["report"] or ""),
            analysis=str(row["analysis"] or ""),
            search_results=[
                item for item in _json_loads_list(row["search_results"]) if isinstance(item, dict)
            ],
            error=row["error"],
            report_path=row["report_path"],
            created_at=str(row["created_at"]),
            updated_at=str(row["updated_at"]),
            step_count=int(row["step_count"] or 0),
            max_steps=int(row["max_steps"] or 0),
            session_cost=row["session_cost"],
            max_cost=row["max_cost"],
            budget_exceeded=bool(row["budget_exceeded"]),
        )

    def get(self, thread_id: str) -> JobRecord | None:
        with self._lock, self._connect() as conn:
            row = conn.execute("SELECT * FROM jobs WHERE thread_id = ?", (thread_id,)).fetchone()
            return self._row_to_job(row) if row else None

    def list_recent(self, limit: int = 20) -> list[JobRecord]:
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM jobs ORDER BY updated_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
            return [self._row_to_job(row) for row in rows]

    def is_running(self, thread_id: str) -> bool:
        job = self.get(thread_id)
        return job is not None and job.status == "running"

    def set(self, job: JobRecord) -> None:
        now = _now_iso()
        created_at = job.created_at or now
        updated_at = job.updated_at or now
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO jobs (
                    thread_id, topic, status, executed_nodes, current_node, report,
                    analysis, search_results, error, report_path, created_at,
                    updated_at, step_count, max_steps, session_cost, max_cost,
                    budget_exceeded
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    job.thread_id,
                    job.topic,
                    job.status,
                    _json_dumps(job.executed_nodes),
                    job.current_node,
                    job.report,
                    job.analysis,
                    _json_dumps(job.search_results),
                    job.error,
                    job.report_path,
                    created_at,
                    updated_at,
                    job.step_count,
                    job.max_steps,
                    job.session_cost,
                    job.max_cost,
                    int(job.budget_exceeded),
                ),
            )

    def update(self, thread_id: str, **kwargs: Any) -> None:
        if not kwargs:
            return

        normalized = dict(kwargs)
        if "executed_nodes" in normalized:
            normalized["executed_nodes"] = _json_dumps(normalized["executed_nodes"])
        if "search_results" in normalized:
            normalized["search_results"] = _json_dumps(normalized["search_results"])
        if "budget_exceeded" in normalized:
            normalized["budget_exceeded"] = int(bool(normalized["budget_exceeded"]))

        normalized["updated_at"] = _now_iso()
        assignments = ", ".join(f"{key} = ?" for key in normalized)
        values = list(normalized.values())
        values.append(thread_id)

        with self._lock, self._connect() as conn:
            conn.execute(
                f"UPDATE jobs SET {assignments} WHERE thread_id = ?",
                values,
            )

    def hydrate_reports(self, reports_dir: Path) -> None:
        if not reports_dir.exists():
            return

        with self._lock:
            for report_path in reports_dir.glob("*.md"):
                thread_id = report_path.stem
                if self.get(thread_id) is not None:
                    continue
                report = report_path.read_text(encoding="utf-8")
                title = next(
                    (line.removeprefix("#").strip() for line in report.splitlines() if line.startswith("#")),
                    thread_id,
                )
                self.set(
                    JobRecord(
                        thread_id=thread_id,
                        topic=title or thread_id,
                        status="completed",
                        executed_nodes=["supervisor", "search", "analysis", "writer"],
                        report=report,
                        report_path=str(report_path),
                    )
                )

    def delete(self, thread_id: str) -> bool:
        with self._lock, self._connect() as conn:
            cursor = conn.execute("DELETE FROM jobs WHERE thread_id = ?", (thread_id,))
            return cursor.rowcount > 0

    def delete_all_finished(self) -> list[JobRecord]:
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM jobs WHERE status != ?",
                ("running",),
            ).fetchall()
            jobs = [self._row_to_job(row) for row in rows]
            conn.execute("DELETE FROM jobs WHERE status != ?", ("running",))
            return jobs
