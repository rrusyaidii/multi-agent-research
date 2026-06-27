"""Tests for web tools."""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

from research_agent.tools.web_fetch import _extract_text, web_fetch
from research_agent.tools.web_search import _parse_ddg_html, web_search


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


@patch("httpx.Client")
def test_web_search_returns_json(mock_client_cls: MagicMock) -> None:
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
    assert "results" in data
    assert len(data["results"]) >= 1


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
