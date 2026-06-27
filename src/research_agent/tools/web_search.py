"""Web search tool using DuckDuckGo HTML results."""

from __future__ import annotations

import json
import re
from urllib.parse import parse_qs, unquote, urlparse

import httpx
from langchain_core.tools import tool

from research_agent.config import get_settings

USER_AGENT = (
    "Mozilla/5.0 (compatible; ResearchAgent/0.1; +https://github.com/rrusyaidii/multi-agent-research)"
)


def _decode_ddg_url(raw_href: str) -> str:
    if raw_href.startswith("//"):
        raw_href = f"https:{raw_href}"
    parsed = urlparse(raw_href)
    if "duckduckgo.com" in parsed.netloc and parsed.path.startswith("/l/"):
        params = parse_qs(parsed.query)
        if "uddg" in params:
            return unquote(params["uddg"][0])
    return raw_href


def _parse_ddg_html(html: str, limit: int = 8) -> list[dict[str, str]]:
    results: list[dict[str, str]] = []
    pattern = re.compile(
        r'<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="(?P<href>[^"]+)"[^>]*>(?P<title>.*?)</a>'
        r'.*?class="[^"]*result__snippet[^"]*"[^>]*>(?P<snippet>.*?)</(?:a|td|span)>',
        re.IGNORECASE | re.DOTALL,
    )
    for match in pattern.finditer(html):
        title = re.sub(r"<[^>]+>", "", match.group("title")).strip()
        snippet = re.sub(r"<[^>]+>", "", match.group("snippet")).strip()
        url = _decode_ddg_url(match.group("href"))
        if title and url:
            results.append({"title": title, "url": url, "snippet": snippet})
        if len(results) >= limit:
            break
    return results


@tool
def web_search(query: str) -> str:
    """Search the web for information about a topic. Returns JSON with title, url, and snippet."""
    settings = get_settings()
    timeout = settings.tool_timeout_seconds

    try:
        with httpx.Client(timeout=timeout, follow_redirects=True, headers={"User-Agent": USER_AGENT}) as client:
            response = client.get(
                "https://html.duckduckgo.com/html/",
                params={"q": query},
            )
            response.raise_for_status()
            results = _parse_ddg_html(response.text)
    except httpx.TimeoutException:
        return json.dumps({"error": f"Search timed out after {timeout}s", "results": []})
    except httpx.HTTPError as exc:
        return json.dumps({"error": f"Search failed: {exc}", "results": []})

    if not results:
        return json.dumps(
            {
                "error": "No results found. Try a broader query.",
                "results": [],
            }
        )

    return json.dumps({"results": results}, indent=2)
