# Architecture — Multi-Agent Research & Report Generator

## Overview

A multi-agent system built with **LangGraph 1.x** that:
1. Takes a research topic from the user
2. Delegates to specialist agents via a **Supervisor**
3. Each agent performs its task using tools (web search, fetch, analysis)
4. A report writer compiles findings into a structured markdown report
5. All state is persisted via **checkpointers** for session continuity

## System Context

```
┌────────────────────┐
│     User (CLI)     │
│  python -m research │
└─────────┬──────────┘
          │ topic
          ▼
┌──────────────────────────────────────────────────────┐
│                  LangGraph StateGraph                  │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Supervisor  │  │  Search Agt  │  │  Analysis    │ │
│  │  (router)    │◄─┤  (tool loop) │◄─┤  (summarise) │ │
│  └──────┬───────┘  └──────────────┘  └──────┬───────┘ │
│         │                                    │         │
│         └────────────────┬───────────────────┘         │
│                          ▼                             │
│                   ┌──────────────┐                      │
│                   │Report Writer │                      │
│                   │(compile +    │                      │
│                   │ export)      │                      │
│                   └──────┬───────┘                      │
│                          │ FINISH                       │
│                          ▼                              │
│                        END                               │
│                                                          │
│  Persistence: MemorySaver (SQLite)                       │
└──────────────────────────────────────────────────────────┘
```

## Graph Design (LangGraph StateGraph)

### State

```python
class ResearchState(TypedDict):
    messages: Annotated[list[BaseMessage], operator.add]
    topic: str
    search_results: list[dict]
    analysis: str
    report: str
    next_agent: str
    step_count: int
    max_steps: int  # budget control
    thread_id: str
```

### Nodes

| Node | Type | Reads | Writes |
|------|------|-------|--------|
| `supervisor` | Custom | messages, topic, search_results, analysis | next_agent |
| `search` | create_agent + tools | topic | search_results |
| `analysis` | create_agent | search_results | analysis |
| `writer` | create_agent | analysis | report |

### Edges

| From | To | Condition |
|------|----|-----------|
| START | supervisor | Always |
| supervisor | search | next_agent == "search" |
| supervisor | analysis | next_agent == "analysis" |
| supervisor | writer | next_agent == "writer" |
| supervisor | END | next_agent == "FINISH" |
| search | supervisor | Always |
| analysis | supervisor | Always |
| writer | supervisor | Always (loops back for review) |

### ToolNode

The `search` agent uses a pre-built `ToolNode` with:
- `web_search(query)` — searches web for results
- `web_fetch(url)` — fetches and extracts content from a URL

## Component Details

### Supervisor

```python
def supervisor_node(state: ResearchState):
    """LLM decides the next agent based on current state."""
    response = llm.with_structured_output(RouteDecision).invoke([
        SystemMessage(content=SUPERVISOR_PROMPT),
        *state["messages"]
    ])
    return {"next_agent": response.next_agent}
```

Routes available: `search`, `analysis`, `writer`, `FINISH`

### Search Agent

```python
search_agent = create_agent(
    llm=llm,
    tools=[web_search, web_fetch],
    prompt="You are a research agent. Search the web and gather information."
)
```

### Analysis Agent

```python
analysis_agent = create_agent(
    llm=llm,
    tools=[],  # pure reasoning
    prompt="Analyse the search results and extract key findings."
)
```

### Report Writer

```python
writer_agent = create_agent(
    llm=llm,
    tools=[],
    prompt="Compile the analysis into a structured markdown report."
)
```

## Cost Budget Control

```
graph = StateGraph(ResearchState)
graph.set_entry_point("supervisor")

# Add conditional edge with step counter
# If step_count >= max_steps, force FINISH

MAX_STEPS = 30   # total LLM calls per session
MAX_COST = 0.05  # hard budget in USD (Gemini Flash)
```

## State Persistence

```python
from langgraph.checkpoint.memory import MemorySaver

checkpointer = MemorySaver()
app = graph.compile(checkpointer=checkpointer)

# Continue session with thread_id
config = {"configurable": {"thread_id": "research-01"}}
```

## Error Handling Strategy

| Failure | Behaviour |
|---------|-----------|
| LLM call fails | Retry (2x with backoff) → skip node |
| Tool timeout (10s) | Return error message to agent |
| Budget exceeded | Force FINISH, return partial results |
| Invalid routing | Default to FINISH (safe exit) |

## Deployment Architecture

### Local
```
User → CLI → StateGraph (in-process) → SQLite → stdout
```

### API (v2)
```
User → HTTP → FastAPI → StateGraph (per request) → PostgreSQL → JSON response
```

### Web (v3)
```
Browser → Next.js → FastAPI → StateGraph → PostgreSQL → SSE stream → UI
```
