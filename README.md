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
```

---

<p align="center">
  Built with 🦞 <a href="https://openclaw.ai">OpenClaw</a> — Haziq Rusyaidi • Jun 2026
</p>
