"""Tests for web tools."""

from __future__ import annotations

import importlib
import json
from unittest.mock import MagicMock, patch

import pytest

from research_agent.config import Settings, _resolve_search_provider
from research_agent.tools.tavily_search import _parse_tavily_response, tavily_search
from research_agent.tools.web_fetch import _extract_text, web_fetch
from research_agent.tools.web_search import _parse_ddg_html, duckduckgo_search, web_search

# Import submodule directly — package __init__ re-exports the tool under the same name.
_web_search_module = importlib.import_module("research_agent.tools.web_search")


def test_parse_ddg_html_extracts_results() -> None:
    html = """
    <a class="result__a" href="https://example.com">Example Title</a>
    <a class="result__snippet">A useful snippet about the topic.</a>
    """
    results = _parse_ddg_html(html)
    assert len(results) >= 1
    assert results[0]["title"] == "Example Title"
    assert results[0]["url"] == "https://example.com"


def test_extract_text_strips_scripts() -> None:
    html = "<html><script>bad()</script><body><p>Hello world</p></body></html>"
    text = _extract_text(html)
    assert "Hello world" in text
    assert "bad()" not in text


def test_parse_tavily_response_maps_results() -> None:
    data = {
        "results": [
            {
                "title": "Host A",
                "url": "https://hosta.com",
                "content": "VPS from $5 per month with 2GB RAM.",
            }
        ]
    }
    results = _parse_tavily_response(data)
    assert len(results) == 1
    assert results[0]["title"] == "Host A"
    assert "5 per month" in results[0]["snippet"]


def test_resolve_search_provider_falls_back_without_key() -> None:
    assert _resolve_search_provider("tavily", "") == "duckduckgo"
    assert _resolve_search_provider("tavily", "tvly-key") == "tavily"


@patch("httpx.Client")
def test_duckduckgo_search_returns_json(mock_client_cls: MagicMock) -> None:
    mock_response = MagicMock()
    mock_response.text = """
    <a class="result__a" href="https://example.com">Result</a>
    <a class="result__snippet">Snippet text</a>
    """
    mock_response.raise_for_status = MagicMock()

    mock_client = MagicMock()
    mock_client.__enter__ = MagicMock(return_value=mock_client)
    mock_client.__exit__ = MagicMock(return_value=False)
    mock_client.get.return_value = mock_response
    mock_client_cls.return_value = mock_client

    raw = duckduckgo_search("test query", timeout=10.0)
    data = json.loads(raw)
    assert data["provider"] == "duckduckgo"
    assert len(data["results"]) >= 1


@patch.object(_web_search_module, "get_settings")
@patch("httpx.Client")
def test_web_search_uses_duckduckgo_by_default(
    mock_client_cls: MagicMock,
    mock_get_settings: MagicMock,
) -> None:
    mock_get_settings.return_value = Settings(
        llm_provider="openrouter",
        openrouter_api_key="key",
        openrouter_model="google/gemini-2.5-flash",
        max_llm_calls=30,
        max_tokens_per_call=2000,
        tool_timeout_seconds=10.0,
        max_cost_per_session=0.05,
        checkpointer_dir="./.checkpoints",
        log_level="INFO",
        search_provider="duckduckgo",
        tavily_api_key="",
        tavily_max_results=8,
        tavily_search_depth="advanced",
    )

    mock_response = MagicMock()
    mock_response.text = """
    <a class="result__a" href="https://example.com">Result</a>
    <a class="result__snippet">Snippet text</a>
    """
    mock_response.raise_for_status = MagicMock()

    mock_client = MagicMock()
    mock_client.__enter__ = MagicMock(return_value=mock_client)
    mock_client.__exit__ = MagicMock(return_value=False)
    mock_client.get.return_value = mock_response
    mock_client_cls.return_value = mock_client

    raw = web_search.invoke({"query": "test query"})
    data = json.loads(raw)
    assert data["provider"] == "duckduckgo"


@patch("httpx.Client")
def test_tavily_search_returns_json(mock_client_cls: MagicMock) -> None:
    settings = Settings(
        llm_provider="openrouter",
        openrouter_api_key="key",
        openrouter_model="google/gemini-2.5-flash",
        max_llm_calls=30,
        max_tokens_per_call=2000,
        tool_timeout_seconds=10.0,
        max_cost_per_session=0.05,
        checkpointer_dir="./.checkpoints",
        log_level="INFO",
        search_provider="tavily",
        tavily_api_key="tvly-test",
        tavily_max_results=8,
        tavily_search_depth="advanced",
    )

    mock_response = MagicMock()
    mock_response.json.return_value = {
        "results": [
            {
                "title": "Tavily Result",
                "url": "https://example.com/page",
                "content": "Detailed content about VPS hosting.",
            }
        ]
    }
    mock_response.raise_for_status = MagicMock()

    mock_client = MagicMock()
    mock_client.__enter__ = MagicMock(return_value=mock_client)
    mock_client.__exit__ = MagicMock(return_value=False)
    mock_client.post.return_value = mock_response
    mock_client_cls.return_value = mock_client

    raw = tavily_search("VPS hosting Malaysia", settings)
    data = json.loads(raw)
    assert data["provider"] == "tavily"
    assert data["results"][0]["title"] == "Tavily Result"


@patch.object(_web_search_module, "get_settings")
@patch("httpx.Client")
def test_web_search_uses_tavily_when_configured(
    mock_client_cls: MagicMock,
    mock_get_settings: MagicMock,
) -> None:
    mock_get_settings.return_value = Settings(
        llm_provider="openrouter",
        openrouter_api_key="key",
        openrouter_model="google/gemini-2.5-flash",
        max_llm_calls=30,
        max_tokens_per_call=2000,
        tool_timeout_seconds=10.0,
        max_cost_per_session=0.05,
        checkpointer_dir="./.checkpoints",
        log_level="INFO",
        search_provider="tavily",
        tavily_api_key="tvly-test",
        tavily_max_results=8,
        tavily_search_depth="advanced",
    )

    mock_response = MagicMock()
    mock_response.json.return_value = {
        "results": [
            {
                "title": "Provider X",
                "url": "https://providerx.com",
                "content": "Affordable VPS plans.",
            }
        ]
    }
    mock_response.raise_for_status = MagicMock()

    mock_client = MagicMock()
    mock_client.__enter__ = MagicMock(return_value=mock_client)
    mock_client.__exit__ = MagicMock(return_value=False)
    mock_client.post.return_value = mock_response
    mock_client_cls.return_value = mock_client

    raw = web_search.invoke({"query": "VPS hosting"})
    data = json.loads(raw)
    assert data["provider"] == "tavily"
    mock_client.post.assert_called_once()


@patch("httpx.Client")
def test_web_fetch_returns_content(mock_client_cls: MagicMock) -> None:
    mock_response = MagicMock()
    mock_response.text = "<html><body><p>Page content here</p></body></html>"
    mock_response.raise_for_status = MagicMock()

    mock_client = MagicMock()
    mock_client.__enter__ = MagicMock(return_value=mock_client)
    mock_client.__exit__ = MagicMock(return_value=False)
    mock_client.get.return_value = mock_response
    mock_client_cls.return_value = mock_client

    raw = web_fetch.invoke({"url": "https://example.com"})
    data = json.loads(raw)
    assert "Page content here" in data["content"]
