"""Fetch and extract readable text from a web page."""

from __future__ import annotations

import json
import re

import httpx
from bs4 import BeautifulSoup
from langchain_core.tools import tool

from research_agent.config import get_settings

USER_AGENT = (
    "Mozilla/5.0 (compatible; ResearchAgent/0.1; +https://github.com/rrusyaidii/multi-agent-research)"
)
MAX_CONTENT_CHARS = 8000


def _extract_text(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "nav", "footer", "header", "noscript", "svg"]):
        tag.decompose()

    text = soup.get_text(separator="\n")
    lines = [re.sub(r"\s+", " ", line).strip() for line in text.splitlines()]
    cleaned = "\n".join(line for line in lines if line)
    return cleaned[:MAX_CONTENT_CHARS]


@tool
def web_fetch(url: str) -> str:
    """Fetch a URL and return extracted page text content."""
    settings = get_settings()
    timeout = settings.tool_timeout_seconds

    if not url.startswith(("http://", "https://")):
        return json.dumps({"error": "URL must start with http:// or https://", "content": ""})

    try:
        with httpx.Client(timeout=timeout, follow_redirects=True, headers={"User-Agent": USER_AGENT}) as client:
            response = client.get(url)
            response.raise_for_status()
            content = _extract_text(response.text)
    except httpx.TimeoutException:
        return json.dumps({"error": f"Fetch timed out after {timeout}s", "content": ""})
    except httpx.HTTPError as exc:
        return json.dumps({"error": f"Fetch failed: {exc}", "content": ""})

    if not content.strip():
        return json.dumps({"error": "No readable content extracted from page.", "content": ""})

    return json.dumps({"url": url, "content": content}, indent=2)
