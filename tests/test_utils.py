"""Tests for shared utility helpers."""

from __future__ import annotations

from research_agent.utils import normalize_report_markdown


class TestNormalizeReportMarkdown:
    def test_converts_bold_label_to_bullet(self) -> None:
        raw = "*   **Model (LLM):** The central processing unit."
        result = normalize_report_markdown(raw)
        assert "**" not in result
        assert "- Model (LLM): The central processing unit." in result

    def test_strips_inline_bold(self) -> None:
        raw = "This is **important** text."
        result = normalize_report_markdown(raw)
        assert result == "This is important text."

    def test_normalizes_star_bullets(self) -> None:
        raw = "* First item\n* Second item"
        result = normalize_report_markdown(raw)
        assert "- First item" in result
        assert "- Second item" in result

    def test_preserves_headings(self) -> None:
        raw = "# Title\n\n## Section\n\nParagraph."
        result = normalize_report_markdown(raw)
        assert "# Title" in result
        assert "## Section" in result

    def test_empty_string(self) -> None:
        assert normalize_report_markdown("") == ""
        assert normalize_report_markdown("   ") == "   "
