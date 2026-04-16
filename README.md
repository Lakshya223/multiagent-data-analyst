# Lens — Retail Customer Journey Intelligence Agent

An agentic AI system that autonomously queries a large retail BigQuery dataset, performs statistical analysis and data visualization, and synthesizes evidence-backed hypotheses — all from a single natural-language question.

**Live deployment:**
- Frontend: https://retail-frontend-985676490491.us-central1.run.app
- Backend API: https://retail-backend-985676490491.us-central1.run.app

---

## What It Does

A user types a business question such as *"What are the top product categories by revenue?"* The system:

1. **Collects** — writes and executes BigQuery SQL to retrieve relevant rows from up to three tables
2. **Explores** — runs Python (pandas, matplotlib, plotly) on the retrieved data to compute statistics, correlations, and time-series trends, producing charts
3. **Hypothesizes** — synthesizes all findings into a structured markdown report with testable hypotheses, confidence levels, and actionable recommendations

The agent loops iteratively: if the hypothesis agent decides the data is insufficient, it signals the supervisor, which routes back to SQL → EDA → Hypothesis until the stopping condition is met (cap of 8 agent calls per question).

---

## Project Structure

```
├── backend/
│   ├── agents/
│   │   ├── graph.py            # LangGraph StateGraph wiring
│   │   ├── state.py            # Shared AgentState TypedDict
│   │   ├── supervisor.py       # Orchestrator — routes between agents
│   │   ├── sql_agent.py        # Writes + executes BigQuery SQL
│   │   ├── eda_agent.py        # Python EDA + chart generation
│   │   ├── hypothesis_agent.py # Report synthesis
│   │   └── fallback_agent.py   # Handles off-topic / conversational messages
│   ├── prompts/
│   │   ├── supervisor.txt
│   │   ├── sql_agent.txt       # Includes full schema via {schema} injection
│   │   ├── eda_agent.txt
│   │   └── hypothesis_agent.txt
│   ├── docs/
│   │   ├── schema.txt          # Full BigQuery schema (injected into SQL prompt)
│   │   └── table_schema.pdf    # Original schema reference document
│   ├── api.py                  # FastAPI app with SSE streaming endpoint
│   ├── config.py               # Vertex AI + BigQuery client init
│   ├── session.py              # Per-request session folder management
│   └── gcs.py                  # Google Cloud Storage artifact upload/download
├── frontend-next/
│   ├── app/                    # Next.js 16 app router
│   ├── components/
│   │   ├── chat/               # Chat panel (UserBubble, AssistantCard, SuggestionChips)
│   │   ├── results/            # Results panel (FindingsTab, AnalysisTab, DataTab, TabBar)
│   │   └── ui/                 # Shared UI (MarkdownText custom renderer)
│   ├── hooks/
│   │   └── useAnalysis.ts      # SSE streaming client + conversation history state
│   └── types/index.ts          # Shared TypeScript types and suggestion chips
├── Dockerfile                  # Backend container (deployed to Cloud Run)
├── requirements.txt
└── .env.example
```

---

## Dataset

All data lives in BigQuery under `lakshya-agenticai.retail` and is fetched at runtime — nothing is bundled into the app.

| Table | Rows | Date Range | Description |
|---|---|---|---|
| `transaction_data` | ~3 million | Jan 1 – Jul 30, 2025 (7 months) | Order and item-level transactions: revenue, discounts, returns, product categories, loyalty, store/channel |
| `clickstream_session_data` | ~3 million | Jan 2 – Jan 11, 2025 (10 days) | Web session-level data: cart flags, checkout flags, device/browser, referral domain |
| `email_data` | ~5 million | Jan 1 – Feb 27, 2025 (2 months) | Email campaign data: sends, opens, clicks, bounces, unsubscribes per subscriber |

Each table has 30–45 columns. The full schema (types + descriptions + gotchas) is in [`backend/docs/schema.txt`](backend/docs/schema.txt) and is injected into every SQL agent prompt.

---

## Architecture

### Agent Framework: LangGraph

The system uses a **LangGraph `StateGraph`** with a central supervisor that dynamically routes to specialist agents. All agents share a typed `AgentState`.

```
         ┌─────────────┐
    ───► │  Supervisor  │ ◄─────────────────────┐
         └──────┬───────┘                       │
                │ routes to                     │
     ┌──────────┼──────────┬──────────┐         │
     ▼          ▼          ▼          ▼         │
 sql_agent  eda_agent  fallback    FINISH      │
     │          │                              │
     └──────────┴──► hypothesis_agent ─────────┘
                           │ (needs more data?)
                           └──► supervisor (loop)
```

### Agents

| Agent | Role |
|---|---|
| **Supervisor** | Reads full session state and routes to the next agent. Uses Gemini 2.0 Flash to decide dynamically — no fixed pipeline. |
| **SQL Agent** | Writes a BigQuery SQL query from the user question + full schema context, executes it, saves results as CSV, returns a text summary. Can be called multiple times per question. |
| **EDA Agent** | Writes and executes Python (pandas, matplotlib, plotly) in a sandboxed `exec()` environment on the latest CSV. Generates charts (PNG), computes statistics, and produces per-round and per-chart narrative inferences. |
| **Hypothesis Agent** | Reads all SQL summaries and EDA inferences, checks data sufficiency, and synthesizes a structured markdown report: Summary → Hypotheses → Data Evidence → Recommendations. If data is insufficient, signals the supervisor for another data collection round. |
| **Fallback Agent** | Handles greetings, conversational messages, questions about conversation history, and off-topic requests. Has access to the full conversation history to answer memory-recall questions. |

### LLM: Gemini 2.0 Flash (via Vertex AI)

All agents use `gemini-2.0-flash` at `temperature=0` for deterministic, reproducible outputs.

### Multi-Agent Patterns Used

- **Orchestrator-handoff**: Supervisor centralizes all routing decisions; workers hand back control after each call
- **Iterative refinement loop**: `hypothesis_agent → supervisor → sql_agent → eda_agent → hypothesis_agent` repeats until data is sufficient or the call cap (8) is reached — implementing the deep research pattern
- **Generator-critic**: Hypothesis agent checks data sufficiency before generating; requests more data when needed

---

## Step-by-Step Pipeline

### Step 1 — Collect

The **SQL Agent** receives the user's natural-language question and a full injected schema (all 3 tables, every column with type and description). It:

1. Checks feasibility — if the question cannot be answered from available tables, returns an `INFEASIBLE:` marker
2. Writes a BigQuery SQL query
3. Executes it against the live dataset via `google-cloud-bigquery`
4. Saves results as a CSV to the session folder
5. Returns a plain-English summary of the rows retrieved

The supervisor may call the SQL agent multiple times with different tasks (e.g., first query transactions, then clickstream).

**Implements:** SQL composition, runtime data retrieval from a non-trivial external source, structured output (INFEASIBLE prefix), artifacts (CSVs).

### Step 2 — Explore and Analyze (EDA)

The **EDA Agent** receives the latest CSV and a task from the supervisor. It:

1. Writes Python code using pandas, numpy, matplotlib, and plotly to analyze the data
2. Executes the code in a sandboxed `exec()` with an isolated namespace
3. Saves charts as PNG files to the session folder
4. After each round, makes a separate LLM call to generate per-chart insight captions
5. Produces a plain-English narrative (business-language only — no internal process language)

Charts are uploaded to Google Cloud Storage and served to the frontend via signed URLs.

**Implements:** Code execution, statistical aggregation, filtering/grouping, data visualization, artifacts (PNGs + CSV).

### Step 3 — Hypothesize

The **Hypothesis Agent** synthesizes all evidence:

1. Runs a sufficiency check — does the collected data support 2–3 meaningful hypotheses?
2. If not, signals the supervisor with a specific data request; the loop continues
3. If sufficient, generates a full markdown report with:
   - **Summary** — 3–5 sentences grounded in specific data points
   - **Hypotheses** — testable statements with supporting evidence cited from SQL/EDA and a confidence level (High / Medium / Low)
   - **Data Evidence** — notes on sources used
   - **Recommendations** — specific, actionable next steps
4. Returns only the Summary as the conversational reply; the full report populates the Findings panel

**Implements:** Grounded natural-language summary, visualizations with captions, structured markdown report citing SQL queries and data.

---

## Grab-Bag Features Implemented

| Feature | Implementation |
|---|---|
| **Iterative refinement loop** | `hypothesis_agent` signals `hypothesis_data_request`; supervisor loops back through `sql_agent → eda_agent → hypothesis_agent` until satisfied or call cap reached |
| **Code execution** | EDA agent writes and executes Python (pandas, matplotlib, plotly) at runtime via `exec()` in an isolated namespace |
| **Artifacts** | CSVs (SQL results), PNGs (charts), `report.md` — all written to a per-session folder and uploaded to GCS |
| **Structured output** | Supervisor emits `{"next", "reason", "task"}` JSON; hypothesis sufficiency check emits `{"sufficient", "missing"}` JSON; findings are parsed from structured markdown sections |
| **Data Visualization** | EDA agent generates multiple charts per question; frontend displays them with per-chart insight captions alongside an overall analysis narrative |

---

## Tech Stack

| Layer | Technology |
|---|---|
| LLM | Gemini 2.0 Flash via Vertex AI (`langchain-google-vertexai`) |
| Agent framework | LangGraph (`StateGraph`) |
| Data store | Google BigQuery |
| Artifact store | Google Cloud Storage |
| Backend | FastAPI + uvicorn, streaming via SSE |
| Frontend | Next.js 16, React 19, Tailwind CSS v4, TypeScript |
| Containerization | Docker |
| Deployment | Google Cloud Run (both frontend and backend) |

---

## Running Locally

### Prerequisites

- Python 3.11+
- Node.js 18+
- A Google Cloud project with BigQuery and Vertex AI enabled
- A service account JSON key with roles: `BigQuery Data Viewer`, `BigQuery Job User`, `Vertex AI User`, `Storage Object Admin`

### Backend

```bash
# 1. Clone the repo and enter the project root
cd "Project 2"

# 2. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env — fill in GOOGLE_APPLICATION_CREDENTIALS, BQ_PROJECT, BQ_DATASET

# 5. Start the backend
uvicorn backend.api:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend-next

# Install dependencies
npm install

# Set the backend URL (or create frontend-next/.env.local)
export NEXT_PUBLIC_API_URL=http://localhost:8000

# Start the dev server
npm run dev
```

Open `http://localhost:3000`.

### Environment Variables

| Variable | Description |
|---|---|
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCP service account JSON key |
| `BQ_PROJECT` | Google Cloud project ID (e.g. `lakshya-agenticai`) |
| `BQ_DATASET` | BigQuery dataset name (e.g. `retail`) |
| `VERTEX_LOCATION` | Vertex AI region (default: `us-central1`) |
| `CORS_ORIGINS` | Comma-separated allowed origins (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_API_URL` | Backend URL consumed by the Next.js frontend |

---

## Deploying to Google Cloud Run

### Backend

```bash
IMAGE=us-central1-docker.pkg.dev/lakshya-agenticai/retail-agent/backend:latest
docker build -t $IMAGE .
docker push $IMAGE
gcloud run deploy retail-backend \
  --image $IMAGE \
  --region us-central1 \
  --set-env-vars BQ_PROJECT=lakshya-agenticai,BQ_DATASET=retail,VERTEX_LOCATION=us-central1 \
  --set-env-vars CORS_ORIGINS=https://your-frontend.run.app \
  --service-account your-sa@your-project.iam.gserviceaccount.com
```

### Frontend

```bash
BACKEND_URL=https://retail-backend-985676490491.us-central1.run.app
IMAGE=us-central1-docker.pkg.dev/lakshya-agenticai/retail-agent/frontend:latest
cd frontend-next
docker build --build-arg NEXT_PUBLIC_API_URL=$BACKEND_URL -t $IMAGE .
docker push $IMAGE
gcloud run deploy retail-frontend --image $IMAGE --region us-central1
```

---

## Key Design Decisions

**Schema injection over RAG** — With only 3 fixed tables and ~4 KB of schema text, the full schema is injected into every SQL agent prompt at load time. No vector database needed; the LLM always has complete column-level context.

**Frontend-driven conversation history** — The frontend maintains a running `conversationHistory` array and sends it with every request. The backend prepends prior turns as `HumanMessage`/`AIMessage` pairs into LangGraph state. No backend session persistence is required, and Cloud Run's ephemeral storage is sufficient.

**SSE streaming** — The backend streams `agent_start` events as each agent begins, giving the frontend real-time progress indicators without polling.

**Per-session artifact isolation** — Each request gets a UUID session folder (`/tmp/sessions/{id}/`) for CSVs, charts, and the markdown report. Artifacts are uploaded to GCS so Cloud Run's ephemeral disk is not a bottleneck.
