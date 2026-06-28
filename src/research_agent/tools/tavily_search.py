"""Tavily Search API integration."""

from __future__ import annotations

import json

import httpx

from research_agent.config import Settings

TAVILY_SEARCH_URL = "https://api.tavily.com/search"


def tavily_search(query: str, settings: Settings) -> str:
    """Search via Tavily API. Returns JSON string matching web_search format."""
    if not settings.tavily_api_key:
        return json.dumps(
            {
                "error": "TAVILY_API_KEY is not set.",
                "results": [],
            }
        )

    payload = {
        "api_key": settings.tavily_api_key,
        "query": query,
        "search_depth": settings.tavily_search_depth,
        "max_results": settings.tavily_max_results,
        "include_answer": False,
    }

    try:
        with httpx.Client(timeout=settings.tool_timeout_seconds) as client:
            response = client.post(TAVILY_SEARCH_URL, json=payload)
            response.raise_for_status()
            data = response.json()
    except httpx.TimeoutException:
        return json.dumps(
            {
                "error": f"Tavily search timed out after {settings.tool_timeout_seconds}s",
                "results": [],
            }
        )
    except httpx.HTTPError as exc:
        return json.dumps({"error": f"Tavily search failed: {exc}", "results": []})

    results = _parse_tavily_response(data)
    if not results:
        return json.dumps(
            {
                "error": "No results found. Try a broader query.",
                "results": [],
            }
        )

    return json.dumps({"results": results, "provider": "tavily"}, indent=2)


def _parse_tavily_response(data: dict) -> list[dict[str, str]]:
    raw_results = data.get("results", [])
    if not isinstance(raw_results, list):
        return []

    parsed: list[dict[str, str]] = []
    for item in raw_results:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title", "")).strip()
        url = str(item.get("url", "")).strip()
        content = str(item.get("content", "")).strip()
        if not title or not url:
            continue
        snippet = content[:500] if content else title
        parsed.append({"title": title, "url": url, "snippet": snippet})

    return parsed
