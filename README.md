# Multi-Agent Research & Report Generator

A **LangGraph-powered multi-agent system** that researches any topic, analyzes findings, and compiles structured reports — autonomously.

Built with a **supervisor agent** that orchestrates specialist workers (search, analysis, writing), all connected through a `StateGraph` with checkpointed memory. Written in Python with LangGraph 1.x.

```
Supervisor ──→ Search ──→ Analysis ──→ Writer ──→ Done
                 ↑            │            │
                 └────────────┴────────────┘
                     all return to supervisor
```

---

## Architecture

### High-Level Design

```
                    ┌─────────────────────────────┐
                    │     User (CLI / API / UI)    │
                    └─────────────┬───────────────┘
                                  │ "research topic"
                                  ▼
          ┌─────────────────────────────────────────────────┐
          │                 SUPERVISOR AGENT                  │
          │  • Receives topic → decides next agent           │
          │  • Routes via conditional edges                  │
          │  • Tracks progress in shared state               │
          │  • Calls FINISH when report is complete          │
          └──┬──────────┬──────────┬───────────┬───────────┘
             │          │          │           │
             ▼          ▼          ▼           ▼
     ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────────┐
     │  SEARCH  │ │ ANALYSIS │ │ WRITER │ │  CHECKPOINT  │
     │  AGENT   │ │  AGENT   │ │ AGENT  │ │  (Memory)    │
     │          │ │          │ │        │ │              │
     │ web_     │ │ summar-  │ │ mark-  │ │ SQLite /     │
     │ search() │ │ ise()    │ │ down   │ │ Postgres     │
     │ web_     │ │ extract()│ │ report │ │ persistence  │
     │ fetch()  │ │          │ │        │ │              │
     └──────────┘ └──────────┘ └────────┘ └──────────────┘
```

### Components

| Component | Responsibility | Tech |
|-----------|---------------|------|
| **Supervisor Agent** | Receives topic, delegates to workers, decides routing | LangGraph StateGraph + conditional edges |
| **Search Agent** | Web search + content retrieval via tools | Python `httpx`, web_search tool |
| **Analysis Agent** | Summarises, extracts key points, identifies patterns | LangGraph create_agent |
| **Report Writer** | Compiles findings into structured markdown report | LangGraph create_agent + `jinja2` template |
| **Checkpointer** | Persists conversation threads for continuation | LangGraph MemorySaver (SQLite) |
| **CLI** | Entry point — takes query from terminal | Python `argparse` / `typer` |
| **FastAPI (optional)** | Expose as REST API for web frontend | FastAPI + uvicorn |
| **Next.js UI (optional)** | Web interface for non-technical users | Next.js + Tailwind |

### Data Flow

```
 1. User sends topic → Supervisor agent
 2. Supervisor analyses → routes to Search Agent
 3. Search Agent loops: search web → fetch content → reflect → done
 4. Returns to Supervisor with search result
 5. Supervisor routes to Analysis Agent
 6. Analysis Agent: summarises, extracts, structures → returns to Supervisor
 7. Supervisor routes to Report Writer (or back to Search if insufficient)
 8. Report Writer compiles markdown → returns final report
 9. Supervisor signals FINISH → END

 State is persisted via Checkpointer at every step.
```

### Directory Structure

```
multi-agent-research/
├── src/
│   └── research_agent/
│       ├── __init__.py
│       ├── graph.py              # StateGraph definition + compilation
│       ├── supervisor.py         # Supervisor agent logic
│       ├── agents/
│       │   ├── __init__.py
│       │   ├── search.py         # Search agent
│       │   ├── analysis.py       # Analysis agent
│       │   └── writer.py         # Report writer agent
│       ├── tools/
│       │   ├── __init__.py
│       │   ├── web_search.py     # Web search tool
│       │   └── web_fetch.py      # Content fetch tool
│       ├── state.py              # TypedDict / Pydantic state model
│       ├── config.py             # Settings, env vars, model config
│       └── cli.py                # CLI entry point
├── tests/
│   ├── __init__.py
│   ├── test_graph.py
│   ├── test_agents.py
│   └── test_tools.py
├── reports/                      # Generated reports output (gitignored)
├── docs/
│   └── architecture.md           # Extended architecture docs
├── scripts/
│   └── seed_prompt.sh            # Example usage scripts
├── pyproject.toml                # Dependencies + tool config
├── Dockerfile                    # Container image
├── docker-compose.yml            # Local dev + VPS deployment
├── .env.example                  # Environment variables template
├── .editorconfig
├── .gitignore
├── .dockerignore
├── README.md
└── ARCHITECTURE.md
```

---

## Tech Stack

| Category | Choice | Why |
|----------|--------|-----|
| **Language** | Python 3.11+ | LangGraph ecosystem, fast prototyping |
| **Agent Framework** | LangGraph 1.x | StateGraph, ToolNode, create_agent, Command, checkpointer |
| **LLM Provider** | OpenRouter / Gemini / OpenAI | Abstracted via `ChatOpenAI`-compatible interface |
| **Model** | `google/gemini-2.5-flash` (default) | Cheap (RM0.07/million in), fast, good reasoning |
| **Web Search** | Custom `httpx` tool (Tavily / SerpAPI / Brave optional) | No API key required for basic search |
| **Report Format** | Markdown (via jinja2) | Portable, readable, easy to export |
| **Checkpointer** | LangGraph MemorySaver (SQLite) | Zero config, file-based persistence |
| **Persistence** | SQLite (local) / PostgreSQL (prod) | Scales from laptop to VPS |
| **API Layer** | FastAPI + uvicorn (optional) | Production-ready async server |
| **Container** | Docker + docker-compose | Consistent dev & deploy |
| **Testing** | pytest + pytest-asyncio | Industry standard for Python |
| **Linting** | ruff + mypy | Fast, strict, PEP 8 compliant |

### Why Gemini Flash for Agent Loops?

Agent loops call the LLM **10-30 times per task**. Using a cheap model is not optional — it's economic necessity.

| Model | Cost per 1M input tokens | 1 research task (~15 calls) |
|-------|--------------------------|----------------------------|
| GPT-4o | ~RM11.00 | ~RM0.18 |
| Claude Sonnet 4 | ~RM13.00 | ~RM0.22 |
| **Gemini 2.5 Flash** | **~RM0.07** | **~RM0.001** |
| DeepSeek V3 | ~RM1.20 | ~RM0.02 |

Default to Gemini Flash. Fallback to stronger model only for final report writing if needed.

---

## Security

Referenced from [OWASP Security Checklist](https://github.com/openclaw/agent-skills/blob/main/ivangdavila/system-architect/references/security-checklist.md).

### Applied Protections

| Threat | Mitigation |
|--------|-----------|
| **API key leak** | `.env` file, never committed. `python-dotenv` loads at runtime. |
| **Prompt injection** | Input sanitisation, max length limits, model-level safety. |
| **Cost runaway** | Hard cap per request: `max_llm_calls=30`, `max_tokens_per_call=2000`. |
| **Rate limiting** | Token bucket per session (LangGraph's built-in rate limiter). |
| **Unrestricted web access** | Tool URLs allowlisted; timeouts on all HTTP calls. |
| **Data persistence** | Checkpointer DB in `.env` path — never in git. |
| **Dependency audit** | `pip-audit` in CI, `pyproject.toml` pins versions. |

### Docker Security

- Non-root user in container
- Pin base image version (`python:3.11-slim`, not `latest`)
- Secrets via environment variables, not baked in
- Health check endpoint for orchestrator

---

## Getting Started

### Prerequisites

- Python 3.11+
- An LLM API key (OpenRouter / Google AI / OpenAI)

### Setup

```bash
# Clone
git clone https://github.com/rrusyaidii/multi-agent-research.git
cd multi-agent-research

# Virtual environment
python -m venv venv
source venv/bin/activate   # Linux/Mac
.\venv\Scripts\activate    # Windows

# Install
pip install -e .

# Environment
cp .env.example .env
# Edit .env with your API key
```

### Usage (CLI)

```bash
# Single research
python -m research_agent "AI agents market trends 2026"

# With thread ID for session continuation
python -m research_agent "Rust vs Go for backend services" --thread-id "rust-go-01"

# Output as JSON
python -m research_agent "Best frameworks for agentic AI" --format json

# Cost limit
python -m research_agent "Quantum computing breakthroughs" --max-cost 0.05
```

### Usage (Python API)

```python
from research_agent import ResearchGraph

graph = ResearchGraph()
report = graph.run("Best practices for LangGraph in production")
print(report)
```

### Usage (FastAPI — optional)

```bash
uvicorn research_agent.api:app --reload

# POST /research
# {"topic": "AI agents frameworks comparison", "thread_id": "cmp-01"}
```

---

## Deployment

### Local (Development)

```bash
python -m research_agent "your topic"
```

### Docker (Anywhere)

```bash
docker compose up --build

# Exposes:
# - CLI via docker exec
# - API at http://localhost:8000 (if FastAPI enabled)
```

### Railway.app (~RM20/month) — Recommended for First Deploy

1. Push repo to GitHub
2. Connect Railway project → select repo
3. Add env vars (API keys)
4. Deploy — auto SSL, auto domain

### VPS (~RM25/month DigitalOcean + Docker + Cloudflare)

```bash
# On VPS:
docker compose up -d
# Nginx reverse proxy → Let's Encrypt → Cloudflare tunnel
```

> **Don't deploy until you have a paying client.** Run local during development. Deploy only when someone is actually using it.

---

## Development Roadmap

### v1 (Current Scope)
- [x] Core graph structure (StateGraph)
- [ ] Supervisor agent with conditional routing
- [ ] Search agent + web tools
- [ ] Analysis agent
- [ ] Report writer
- [ ] SQLite checkpointer
- [ ] CLI interface
- [ ] Tests for each component
- [ ] `.env.example` with all configs

### v2 (Next)
- [ ] FastAPI REST endpoint
- [ ] Rate limiting + auth token
- [ ] PDF export (weasyprint)
- [ ] Progress streaming (SSE)

### v3 (Future)
- [ ] Next.js UI
- [ ] Research history dashboard
- [ ] Multiple report formats (PDF, DOCX, HTML)
- [ ] Custom agent tools (user-provided APIs)

---

## Architecture Decisions

### ADR-001: Supervisor over flat routing

| | |
|---|---|
| **Context** | Multiple agents need coordination. Without a supervisor, routing logic is duplicated and hardcoded in each agent. |
| **Decision** | Single supervisor agent that receives all state and decides the next agent via conditional edges. |
| **Consequence** | + Centralised routing, easy to add new agents. - Supervisor is a single node — if it fails, graph halts. |
| **Mitigation** | Retry + fallback logic on supervisor LLM call. |

### ADR-002: SQLite checkpointer over in-memory

| | |
|---|---|
| **Context** | Users may want to resume research sessions. In-memory state is lost on restart. |
| **Decision** | Use LangGraph's `MemorySaver` with SQLite backend. |
| **Consequence** | + Persistent across restarts. + No external DB needed. - Not suitable for multi-process without PostgreSQL. |
| **Mitigation** | v2 adds PostgreSQL support via `AsyncPostgresSaver`. |

### ADR-003: Gemini Flash as default model

| | |
|---|---|
| **Context** | Agent loops call the LLM 10-30x per task. Cost accumulates fast. |
| **Decision** | Default to Gemini 2.5 Flash (~RM0.07/M tokens). Allow override via `LLM_MODEL` env var. |
| **Consequence** | + ~200x cheaper than GPT-4o per task. - Flash may miss nuanced reasoning. |
| **Mitigation** | Users can set a stronger model for final report generation only. |

### ADR-004: Tool-based web search over hardcoded API

| | |
|---|---|
| **Context** | Multiple search providers exist (Tavily, SerpAPI, Brave, custom). Hardcoding one creates lock-in. |
| **Decision** | Abstract search behind a `web_search()` tool. Default implementation uses `httpx` + public search APIs. Provider can be swapped via config. |
| **Consequence** | + Flexible, testable. + No API key needed for basic version. - Search quality varies by provider. |

---

## Related

- [LangGraph Docs](https://langchain-ai.github.io/langgraph/)
- [LangGraph StateGraph Reference](https://langchain-ai.github.io/langgraph/reference/graphs/#langgraph.graph.state.StateGraph)
- [LangGraph ToolNode](https://langchain-ai.github.io/langgraph/reference/prebuilt/#langgraph.prebuilt.tool_node.ToolNode)
- [Gemini 2.5 Flash Pricing](https://ai.google.dev/pricing)

---

<p align="center">
  Built with 🦞 <a href="https://openclaw.ai">OpenClaw</a> — Haziq Rusyaidi • Jun 2026
</p>
