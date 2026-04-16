import os
import sys
import json
import re

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, AIMessage

from backend.agents.graph import graph
from backend.session import create_session
from backend.logger import get_logger
from backend import gcs as gcs_helper

log = get_logger(__name__)

app = FastAPI(title="Retail Intelligence API")

_cors_raw = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001")
_cors_origins = [o.strip() for o in _cors_raw.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session artifacts live under /tmp/sessions on Cloud Run, local sessions/ in dev
if os.path.exists("/tmp"):
    SESSIONS_DIR = "/tmp/sessions"
else:
    SESSIONS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "sessions")
os.makedirs(SESSIONS_DIR, exist_ok=True)


class AnalyzeRequest(BaseModel):
    question: str
    session_id: str | None = None


def _parse_findings(report_md: str) -> list[dict]:
    """Extract individual findings from report.md.

    Splits at ## level first, then at ### within each section so that each
    hypothesis / recommendation becomes its own card rather than one big block.
    """
    findings = []

    # Split into ## sections (index 0 is everything before the first ##)
    h2_sections = re.split(r"\n##\s+", report_md)

    for section in h2_sections[1:]:
        lines = section.strip().split("\n")
        section_title = lines[0].strip("# ").strip()

        # Skip structural / summary sections — displayed separately in the UI
        if section_title.lower() in ("summary", "executive summary", "data evidence"):
            continue

        section_body = "\n".join(lines[1:])

        # Try to split the section body into ### sub-items
        sub_sections = re.split(r"\n###\s+", section_body)

        if len(sub_sections) > 1:
            # First element is text before the first ### — usually empty, skip it
            for sub in sub_sections[1:]:
                sub_lines = sub.strip().split("\n")
                raw_title = sub_lines[0].strip("# ").strip()
                # Strip any "Hypothesis N:" / "Recommendation N:" prefix
                title = re.sub(
                    r"^(?:Hypothesis|Recommendation)\s*\d*[:\.\-]?\s*",
                    "",
                    raw_title,
                    flags=re.IGNORECASE,
                ).strip() or raw_title

                body_lines = []
                confidence = "Medium"
                for line in sub_lines[1:]:
                    conf_m = re.search(
                        r"\*{0,2}confidence(?:\s+level)?\*{0,2}[:\*\s]+(high|medium|low)",
                        line,
                        re.IGNORECASE,
                    )
                    if conf_m:
                        confidence = conf_m.group(1).capitalize()
                    else:
                        body_lines.append(line)

                body = "\n".join(body_lines).strip()
                if title and body:
                    findings.append({"title": title, "body": body, "confidence": confidence})
                if len(findings) >= 8:
                    return findings
        else:
            # No ### sub-sections — treat whole section as one finding
            body_lines = []
            confidence = "Medium"
            for line in lines[1:]:
                conf_m = re.search(
                    r"\*{0,2}confidence(?:\s+level)?\*{0,2}[:\*\s]+(high|medium|low)",
                    line,
                    re.IGNORECASE,
                )
                if conf_m:
                    confidence = conf_m.group(1).capitalize()
                else:
                    body_lines.append(line)

            body = "\n".join(body_lines).strip()
            if section_title and body:
                findings.append({"title": section_title, "body": body, "confidence": confidence})
            if len(findings) >= 8:
                return findings

    return findings


def _extract_summary(report_md: str) -> str:
    """Extract the ## Summary section from the report."""
    lines = report_md.split("\n")
    summary_lines = []
    in_summary = False
    for line in lines:
        stripped = line.lower().strip()
        if stripped in ("## summary", "## executive summary"):
            in_summary = True
            continue  # skip the heading itself
        elif in_summary and line.startswith("## "):
            break
        if in_summary:
            summary_lines.append(line)
    return "\n".join(summary_lines).strip()


def _generate_direct_answer(question: str, summary: str, findings: list[dict]) -> str:
    """Generate a short, direct conversational answer to the user's question."""
    from backend.config import llm
    from langchain_core.messages import HumanMessage as HM

    findings_text = "\n".join(
        f"- {f['title']}: {f['body'][:200]}" for f in findings[:4]
    )
    context = (
        f"User question: \"{question}\"\n\n"
        f"Analysis summary:\n{summary[:600]}\n\n"
        f"Key findings:\n{findings_text}\n\n"
        f"Write a direct 2-4 sentence response that answers the user's question. "
        f"Be specific and reference actual numbers/findings. "
        f"Do NOT say 'based on the analysis' or 'the findings show' — just answer directly."
    )
    try:
        response = llm.invoke([HM(content=context)])
        return response.content.strip()
    except Exception:
        return summary[:400] if summary else ""


def _parse_csv(csv_path: str) -> dict | None:
    """Read CSV into columns + rows dicts (first 100 rows) with JSON-safe types."""
    try:
        import pandas as pd
        import json as _json
        if not os.path.exists(csv_path):
            log.warning(f"CSV not found: {csv_path!r}")
            return None
        df = pd.read_csv(csv_path, nrows=100)
        # Round numeric columns to 2 decimal places for clean display
        numeric_cols = df.select_dtypes(include="number").columns
        if len(numeric_cols):
            df[numeric_cols] = df[numeric_cols].round(2)
        # pandas to_json handles all numpy types (int64/float64/bool/datetime)
        rows = _json.loads(df.to_json(orient="records", date_format="iso"))
        return {"columns": list(df.columns), "rows": rows}
    except Exception as e:
        log.warning(f"_parse_csv failed for {csv_path!r}: {e}")
        return None


def _extract_all_sql_queries(messages: list) -> list[str]:
    """Extract all SQL blocks from all SQL agent messages."""
    queries = []
    for msg in messages:
        if isinstance(msg, AIMessage) and "SQL executed:" in msg.content:
            m = re.search(r"```sql\s*(.*?)```", msg.content, re.DOTALL)
            if m:
                queries.append(m.group(1).strip())
    return queries


def _pair_chart_inferences(chart_paths: list[str], eda_inferences: list[str]) -> list[str]:
    """Pair each chart with its EDA round inference text (best-effort)."""
    result = []
    for i in range(len(chart_paths)):
        result.append(eda_inferences[i] if i < len(eda_inferences) else "")
    return result


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/artifact/{session_id}/{filename}")
def get_artifact(session_id: str, filename: str):
    from fastapi import HTTPException
    path = os.path.join(SESSIONS_DIR, session_id, filename)
    if not os.path.exists(path):
        if not gcs_helper.download_artifact(session_id, filename, path):
            raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    def event_stream():
        session = create_session()
        session_id = session["session_id"]
        log.info(f"NEW REQUEST | session={session_id} | question={req.question!r}")

        initial_state = {
            "messages": [HumanMessage(content=req.question)],
            # New dynamic fields (defaults)
            "supervisor_task": "",
            "agent_call_count": 0,
            "hypothesis_data_request": "",
            "eda_inferences": [],
            "csv_schemas": [],
            **session,
        }

        accumulated: dict = {}

        try:
            for event in graph.stream(initial_state, stream_mode="updates"):
                node_name = list(event.keys())[0]
                node_delta = event[node_name]

                # Emit agent progress to frontend (skip supervisor internal routing)
                if node_name not in ("supervisor", "__end__"):
                    data = json.dumps({"type": "agent_start", "agent": node_name})
                    yield f"data: {data}\n\n"

                # Accumulate state — lists are replaced (agents return full accumulated lists)
                for k, v in node_delta.items():
                    if k != "messages" and v is not None:
                        accumulated[k] = v
                for msg in node_delta.get("messages", []):
                    accumulated.setdefault("messages", []).append(msg)

        except Exception as e:
            log.error(f"Graph error: {e}")
            err = json.dumps({"type": "error", "message": str(e)})
            yield f"data: {err}\n\n"
            yield "data: [DONE]\n\n"
            return

        # Upload session artifacts to GCS for cross-instance access
        gcs_helper.upload_session(session_id, session["session_dir"])

        # --- Build result payload ---
        all_messages = initial_state["messages"] + accumulated.get("messages", [])
        csv_paths = accumulated.get("csv_paths", [])
        chart_paths = accumulated.get("chart_paths", [])
        eda_inferences = accumulated.get("eda_inferences", [])

        # Findings from report.md (needed before answer generation)
        findings: list[dict] = []
        summary: str = ""
        report_path = os.path.join(SESSIONS_DIR, session_id, "report.md")
        if os.path.exists(report_path):
            with open(report_path, encoding="utf-8") as f:
                report_md = f.read()
            findings = _parse_findings(report_md)
            summary = _extract_summary(report_md)

        # Generate a direct conversational answer to the user's question
        answer = _generate_direct_answer(req.question, summary, findings) if (summary or findings) else ""

        # Fallback: if hypothesis_agent was skipped (no report.md), synthesise an answer
        # directly from EDA inferences and SQL summaries rather than dumping raw agent output
        if not answer:
            sql_summaries = accumulated.get("sql_summaries", [])
            fallback_context = "\n\n".join(filter(None, eda_inferences + sql_summaries))
            if fallback_context:
                answer = _generate_direct_answer(req.question, fallback_context, [])
        # Last resort: first non-boilerplate AI message (should rarely be reached)
        if not answer:
            skip_prefixes = ("[Supervisor]", "[Hypothesis] Need more data", "EDA complete", "SQL executed")
            for msg in reversed(all_messages):
                if isinstance(msg, AIMessage) and not any(msg.content.startswith(p) for p in skip_prefixes):
                    answer = msg.content
                    break

        # All SQL queries executed
        sql_queries = _extract_all_sql_queries(all_messages)
        sql_query = sql_queries[0] if sql_queries else None  # backward compat

        # Chart URLs
        chart_urls = [
            f"/artifact/{session_id}/{os.path.basename(p)}"
            for p in chart_paths
            if os.path.exists(p)
        ]

        # Per-chart inferences (generated by EDA agent, one per chart).
        # Fall back to round-pairing if the new field is absent (old sessions).
        chart_inferences_raw = accumulated.get("chart_inferences", [])
        if len(chart_inferences_raw) == len(chart_urls):
            chart_inferences = chart_inferences_raw
        else:
            chart_inferences = _pair_chart_inferences(chart_paths, eda_inferences)

        # Pair each SQL query with its parsed table data
        log.info(f"Pairing {len(sql_queries)} sql_queries with {len(csv_paths)} csv_paths")
        sql_results = []
        for query, csv_path in zip(sql_queries, csv_paths):
            sql_results.append({
                "query": query,
                "table_data": _parse_csv(csv_path),
            })

        result = {
            "type": "result",
            "session_id": session_id,
            "answer": answer,
            "summary": summary,
            "sql_query": sql_query,
            "sql_queries": sql_queries,
            "sql_results": sql_results,
            "chart_urls": chart_urls,
            "chart_inferences": chart_inferences,
            "findings": findings,
            "eda_inferences": eda_inferences,
        }
        log.info(
            f"COMPLETE | session={session_id} | "
            f"findings={len(findings)} | charts={len(chart_urls)} | "
            f"sql_queries={len(sql_queries)} | eda_rounds={len(eda_inferences)} | "
            f"sql_results={len(sql_results)}"
        )
        yield f"data: {json.dumps(result)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
