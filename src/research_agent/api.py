"""FastAPI application for the research agent."""

from __future__ import annotations

import logging
import os
import asyncio
import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from research_agent.graph import close_checkpointer
from research_agent.schemas import (
    HealthResponse,
    ResearchHistoryResponse,
    ResearchRequest,
    ResearchStartResponse,
    ResearchStatusResponse,
)
from research_agent.service import (
    JobConflictError,
    build_history_payload,
    build_status_payload,
    cancel_research,
    start_research,
)

logger = logging.getLogger(__name__)


def _configure_logging() -> None:
    from research_agent.config import get_settings

    settings = get_settings()
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(levelname)s %(name)s: %(message)s",
    )


def _cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "http://localhost:3000")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


@asynccontextmanager
async def lifespan(_app: FastAPI):
    _configure_logging()
    logger.info("Research API starting")
    yield
    close_checkpointer()
    logger.info("Research API shutdown complete")


app = FastAPI(
    title="Research Agent API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse()


@app.post("/research", response_model=ResearchStartResponse)
def create_research(request: ResearchRequest) -> ResearchStartResponse:
    try:
        job = start_research(request.topic.strip(), request.thread_id)
    except JobConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return ResearchStartResponse(
        thread_id=job.thread_id,
        status="running",
        topic=job.topic,
    )


@app.get("/research", response_model=ResearchHistoryResponse)
def research_history(limit: int = 20) -> ResearchHistoryResponse:
    safe_limit = max(1, min(limit, 100))
    return ResearchHistoryResponse(items=build_history_payload(safe_limit))


@app.post("/research/{thread_id}/cancel", response_model=ResearchStatusResponse)
def cancel_research_job(thread_id: str) -> ResearchStatusResponse:
    job = cancel_research(thread_id)
    if job is None:
        return ResearchStatusResponse(
            thread_id=thread_id,
            topic="",
            status="not_found",
            steps=[],
        )

    payload = build_status_payload(thread_id)
    if payload is None:
        return ResearchStatusResponse(
            thread_id=thread_id,
            topic="",
            status="not_found",
            steps=[],
        )
    return ResearchStatusResponse(**payload)


@app.get("/research/{thread_id}/stream")
async def research_stream(thread_id: str) -> StreamingResponse:
    async def event_generator():
        last_payload = ""
        while True:
            payload = build_status_payload(thread_id)
            if payload is None:
                payload = {
                    "thread_id": thread_id,
                    "topic": "",
                    "status": "not_found",
                    "steps": [],
                    "report": None,
                    "analysis": None,
                    "error": None,
                    "step_count": 0,
                    "max_steps": 0,
                    "session_cost": None,
                    "max_cost": None,
                    "budget_exceeded": False,
                }

            serialized = json.dumps(payload)
            if serialized != last_payload:
                yield f"event: status\ndata: {serialized}\n\n"
                last_payload = serialized

            if payload["status"] in {"completed", "failed", "cancelled", "not_found"}:
                yield f"event: done\ndata: {serialized}\n\n"
                break

            await asyncio.sleep(0.5)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/status/{thread_id}", response_model=ResearchStatusResponse)
def research_status(thread_id: str) -> ResearchStatusResponse:
    payload = build_status_payload(thread_id)
    if payload is None:
        return ResearchStatusResponse(
            thread_id=thread_id,
            topic="",
            status="not_found",
            steps=[],
        )

    return ResearchStatusResponse(**payload)


def main() -> None:
    import uvicorn

    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    uvicorn.run("research_agent.api:app", host=host, port=port, reload=True)


if __name__ == "__main__":
    main()
