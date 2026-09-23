# Project Progress — Retail Customer Journey Intelligence Agent

## Stack
- **Framework**: LangGraph (supervisor + workers pattern)
- **LLM**: Gemini 2.0 Flash via Vertex AI (GCP credits)
- **Data**: BigQuery (`lakshya-agenticai.retail.*`)
- **Frontend**: Next.js (React + TypeScript + Tailwind) — replaces Streamlit
- **Backend API**: FastAPI (SSE streaming) + existing LangGraph graph
- **Auth**: GCP Service Account JSON

---

## What's Built ✅

### Infrastructure
- [x] Full project folder structure
- [x] `.env`, `.gitignore`, `requirements.txt`
- [x] GCP service account connected and verified
- [x] BigQuery connection tested (3 tables, 11M rows total)
- [x] Vertex AI / Gemini connection tested

### Data Layer
- [x] `transactions` table — 3,000,000 rows
- [x] `clickstream` table — 3,000,000 rows (`clickstream_session_data`)
- [x] `email` table — 5,000,000 rows
- [x] All 3 tables registered in `TABLE_MAP` in `config.py`

### Backend — Tools
- [x] `bigquery_tool.py` — `make_sql_tool(session_dir)`: runs BQ SQL, saves CSV
- [x] `code_execution.py` — `make_eda_tool(csv_path, session_dir)`: exec pandas/matplotlib code
- [x] `artifact_tool.py` — `save_report()`, `read_artifact()`

### Backend — Agents (5 total)
- [x] **Supervisor** (`supervisor.py`) — routes via Gemini JSON output, stores `user_question` in state
- [x] **SQL Agent** (`sql_agent.py`) — 2-step: LLM generates SQL → extract + execute directly on BQ, retry on error (max 3x)
- [x] **EDA Agent** (`eda_agent.py`) — 2-step: LLM generates pandas code → extract + exec directly, saves charts as PNGs
- [x] **Hypothesis Agent** (`hypothesis_agent.py`) — generates markdown report, saves `report.md`, returns executive summary
- [x] **Fallback Agent** (`fallback_agent.py`) — handles off-topic questions

### Backend — Logging
- [x] Structured logging across all 5 agents (`logging` module)
- [x] Format: `HH:MM:SS  agent_name  LEVEL  message`
- [x] Logs: routing decisions, SQL generation, BQ row counts, code block execution, chart saves, report generation
- [x] Noisy third-party loggers silenced (httpx, google, urllib3)

### Backend — LangGraph Graph
- [x] `state.py` — `AgentState` TypedDict + `RouteDecision` Pydantic model + `eda_code` field
- [x] `graph.py` — full `StateGraph`: START → Supervisor → [SQL / EDA / Hypothesis / Fallback] → END
- [x] Supervisor → workers → back to supervisor loop wired up
- [x] Conditional edges from supervisor to all 5 outcomes

### Backend — FastAPI API (`backend/api.py`)
- [x] `POST /analyze` — accepts `{question, session_id?}`, streams SSE events
- [x] SSE event types: `agent_start`, `result`, `error`, `[DONE]`
- [x] `GET /artifact/{session_id}/{filename}` — serves PNGs and CSVs
- [x] `GET /health` — healthcheck
- [x] CORS configured for `localhost:3000`
- [x] Findings parsed from `report.md` (split on `##` headings, confidence extracted)
- [x] Table data loaded from latest CSV (first 100 rows)

### Prompts
- [x] `supervisor.txt` — routing rules with all 3 table descriptions
- [x] `sql_agent.txt` — BigQuery schema for all 3 tables + join keys
- [x] `eda_agent.txt` — pandas/matplotlib instructions with pre-loaded `df`
- [x] `hypothesis_agent.txt` — hypothesis + report structure

### Frontend — Next.js (`frontend-next/`)
- [x] Next.js 16 + TypeScript + Tailwind CSS 4
- [x] Two-panel layout matching design mockup:
  - **Left panel** (380px): chat history + fixed bottom input
  - **Right panel** (flex): Findings / Charts / Data tabs
- [x] `StatusBar` — `● Idle` / `● Processing: SQL Agent` live indicator
- [x] `ChatPanel` — header (Lens logo), scrollable message list, suggestion chips, fixed input
- [x] `UserBubble` — blue pill bubbles (right-aligned)
- [x] `AssistantCard` — gray card with Hypothesis / SQL / Analysis color badge
- [x] `ResultsPanel` — tab bar + tab content switcher
- [x] `FindingsTab` + `FindingCard` — colored left-border cards (teal / violet / orange cycling)
- [x] `ChartsTab` — chart image grid
- [x] `DataTab` — full HTML table with sticky header
- [x] `EmptyState` — centered icon + suggestion chip grid (right panel)
- [x] `useAnalysis` hook — SSE connection, state management, error handling
- [x] TypeScript types in `types/index.ts`
- [x] Zero TS errors (`npm run build` clean)

---

## End-to-End Pipeline Verified ✅

Question: *"What are the top product categories by revenue?"*

```
User → Supervisor → SQL Agent → EDA Agent → Hypothesis Agent → FINISH
```

| Stage | Result |
|---|---|
| SQL Agent | BigQuery query ran, CSV saved |
| EDA Agent | Stats computed, chart saved |
| Hypothesis Agent | 4 findings extracted, report.md saved |
| SSE stream | agent_start × 3, result, DONE |
| FastAPI result | findings=4, has_data=True, SQL visible |

---

## What's Left ❌

### Testing
- [x] Email campaign analysis test (email_data: open rates by campaign) — `tests/test_integration.py`
- [x] Clickstream funnel analysis test — `tests/test_integration.py`
- [x] Fallback agent test (off-topic question) — `tests/test_integration.py`
- [ ] Full Next.js UI test in browser (charts, data tab, findings tab)

> Note: The 3 BigQuery tables do NOT share a join key (AMPERITY_ID=UUID, SUBSCRIBERKEY=email, CUSTOMER_ID=INT64). Cross-table JOINs return 0 rows. Each table must be queried independently.

### Polish
- [ ] Charts not returning in API (EDA agent produces chart but `chart_urls` empty — investigate)
- [ ] Tighten supervisor prompt to avoid unnecessary re-routing to SQL Agent
- [ ] `README.md`

### Deployment
- [ ] Deploy Next.js to Vercel
- [ ] Deploy FastAPI to Cloud Run (or keep local)
- [ ] Set GCP credentials as secrets in deployment environment

---

## Known Issues / Notes
- Gemini via Vertex AI does not reliably call tools via `create_react_agent` — all agents use a **2-step pattern**: LLM generates SQL/code as text → we extract + execute directly.
- `ChatVertexAI` deprecation warning (harmless, works until LangChain 4.0)
- BigQuery Storage module not installed (uses REST fallback — slightly slower but fine)
- On Windows, uvicorn must be started with `--no-reload` or from a real terminal to avoid port-binding issues with the reloader process

---

## Running Locally

```bash
# Terminal 1 — FastAPI backend
venv\Scripts\uvicorn backend.api:app --reload --port 8000

# Terminal 2 — Next.js frontend
cd frontend-next
npm run dev
# → http://localhost:3000
```

---

## File Structure
```
project-2/
├── backend/
│   ├── agents/
│   │   ├── graph.py
│   │   ├── state.py            # includes eda_code field
│   │   ├── supervisor.py       # + logging
│   │   ├── sql_agent.py        # + logging
│   │   ├── eda_agent.py        # + logging, returns eda_code
│   │   ├── hypothesis_agent.py # + logging
│   │   └── fallback_agent.py
│   ├── tools/
│   │   ├── bigquery_tool.py
│   │   ├── code_execution.py
│   │   └── artifact_tool.py
│   ├── prompts/
│   │   ├── supervisor.txt
│   │   ├── sql_agent.txt
│   │   ├── eda_agent.txt
│   │   └── hypothesis_agent.txt
│   ├── api.py                  # NEW — FastAPI SSE server
│   ├── config.py
│   └── session.py              # includes eda_code: []
├── frontend-next/              # NEW — Next.js app
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── StatusBar.tsx
│   │   ├── chat/
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── ChatHeader.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── UserBubble.tsx
│   │   │   ├── AssistantCard.tsx
│   │   │   ├── SuggestionChips.tsx
│   │   │   └── ChatInput.tsx
│   │   └── results/
│   │       ├── ResultsPanel.tsx
│   │       ├── TabBar.tsx
│   │       ├── FindingsTab.tsx
│   │       ├── FindingCard.tsx
│   │       ├── ChartsTab.tsx
│   │       ├── DataTab.tsx
│   │       └── EmptyState.tsx
│   ├── hooks/
│   │   └── useAnalysis.ts
│   └── types/
│       └── index.ts
├── sessions/
├── .env
├── .gitignore
├── requirements.txt
└── PROGRESS.md
```
