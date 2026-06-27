"""Shared helpers for agent nodes."""

from __future__ import annotations

import json
import logging
import re
import time
from collections.abc import Callable
from typing import TypeVar

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage

logger = logging.getLogger(__name__)

T = TypeVar("T")

_BOLD_LABEL_RE = re.compile(r"\*\*([^*]+?):\*\*\s*")
_BOLD_PAIR_RE = re.compile(r"\*\*([^*]+?)\*\*")
_ITALIC_PAIR_RE = re.compile(r"(?<!\*)\*([^*\n]+?)\*(?!\*)")
_STAR_BULLET_RE = re.compile(r"^(\s*)\*\s+", re.MULTILINE)


def normalize_report_markdown(text: str) -> str:
    """Strip inline emphasis and normalize list markers for clean report output."""
    if not text.strip():
        return text

    normalized = text.replace("\r\n", "\n")
    normalized = _STAR_BULLET_RE.sub(r"\1- ", normalized)
    normalized = _BOLD_LABEL_RE.sub(r"- \1: ", normalized)
    normalized = _BOLD_PAIR_RE.sub(r"\1", normalized)
    normalized = _ITALIC_PAIR_RE.sub(r"\1", normalized)
    return normalized.strip()


def get_last_message_content(messages: list[BaseMessage]) -> str:
    for message in reversed(messages):
        content = message.content
        if isinstance(content, str) and content.strip():
            return content.strip()
        if isinstance(content, list):
            parts = [block.get("text", "") for block in content if isinstance(block, dict)]
            text = "\n".join(part for part in parts if part).strip()
            if text:
                return text
    return ""


def invoke_with_retry(fn: Callable[[], T], retries: int = 2, base_delay: float = 1.0) -> T | None:
    last_error: Exception | None = None
    for attempt in range(retries + 1):
        try:
            return fn()
        except Exception as exc:  # noqa: BLE001 - retry boundary
            last_error = exc
            logger.warning("LLM call failed (attempt %s/%s): %s", attempt + 1, retries + 1, exc)
            if attempt < retries:
                time.sleep(base_delay * (2**attempt))
    logger.error("LLM call failed after retries: %s", last_error)
    return None


def parse_search_results(raw: str) -> list[dict]:
    if not raw.strip():
        return []

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return [{"summary": raw}]

    if isinstance(parsed, list):
        return [item if isinstance(item, dict) else {"summary": str(item)} for item in parsed]
    if isinstance(parsed, dict):
        if "results" in parsed and isinstance(parsed["results"], list):
            return [item if isinstance(item, dict) else {"summary": str(item)} for item in parsed["results"]]
        return [parsed]
    return [{"summary": raw}]


def build_user_message(content: str) -> HumanMessage:
    return HumanMessage(content=content)


def build_ai_message(content: str) -> AIMessage:
    return AIMessage(content=content)
