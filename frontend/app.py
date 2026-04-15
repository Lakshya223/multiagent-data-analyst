import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pandas as pd
import streamlit as st
from langchain_core.messages import AIMessage, HumanMessage

from backend.agents.graph import graph
from backend.session import create_session

EXAMPLE_QUESTIONS = [
    "What are the top product categories by revenue?",
    "What is the return rate by purchase channel?",
    "Which store has the highest average order value?",
    "How do loyalty vs non-loyalty customers differ in purchase behavior?",
    "What discount levels are associated with higher return rates?",
    "Which email campaigns led to the most purchases?",
    "What is the cart abandonment rate by device type?",
]

AGENT_LABELS = {
    "sql_agent": "SQL Agent — querying BigQuery",
    "eda_agent": "EDA Agent — analysis & visualisation",
    "hypothesis_agent": "Hypothesis Agent — generating report",
    "fallback": "Fallback Agent",
}


def _extract_sql_from_messages(messages: list) -> str | None:
    for msg in messages:
        if isinstance(msg, AIMessage) and "SQL executed:" in msg.content:
            match = re.search(r"```sql\s*(.*?)```", msg.content, re.DOTALL)
            if match:
                return match.group(1).strip()
    return None


def _get_final_text(messages: list) -> str:
    for msg in reversed(messages):
        if isinstance(msg, AIMessage) and not msg.content.startswith("[Supervisor]"):
            return msg.content
    return ""


def render_assistant_entry(entry: dict) -> None:
    # Main answer text
    st.markdown(entry["content"])

    # Agent flow — inline badge row
    if entry.get("agent_trace"):
        flow = "  →  ".join(entry["agent_trace"])
        st.caption(f"**Agent flow:** {flow}")

    # SQL Query & Data
    has_sql = entry.get("sql_query") or entry.get("csv_path")
    if has_sql:
        with st.expander("SQL Query & Data", expanded=False):
            if entry.get("sql_query"):
                st.code(entry["sql_query"], language="sql")
            if entry.get("csv_path") and os.path.exists(entry["csv_path"]):
                df = pd.read_csv(entry["csv_path"])
                st.dataframe(df, use_container_width=True, height=300)

    # EDA Analysis
    has_eda = entry.get("eda_code") or entry.get("charts")
    if has_eda:
        with st.expander("EDA Analysis", expanded=False):
            if entry.get("eda_code"):
                for i, code in enumerate(entry["eda_code"], 1):
                    st.markdown(f"**Code block {i}**")
                    st.code(code, language="python")
            for chart in entry.get("charts", []):
                if os.path.exists(chart):
                    st.image(chart, use_container_width=True)

    # Full Report
    if entry.get("report"):
        with st.expander("Full Report", expanded=False):
            st.markdown(entry["report"])


# ── Page config ──────────────────────────────────────────────────────────────
st.set_page_config(page_title="Retail Journey Intelligence", layout="wide")
st.title("Retail Customer Journey Intelligence")
st.caption("Powered by LangGraph · Gemini 2.0 Flash · BigQuery")

# ── Sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:
    # Artifact downloads (only if there are any)
    if "session" in st.session_state:
        artifacts_dir = st.session_state.session["session_dir"]
        if os.path.exists(artifacts_dir):
            files = sorted(os.listdir(artifacts_dir))
            if files:
                st.subheader("Artifacts")
                for f in files:
                    fpath = os.path.join(artifacts_dir, f)
                    with open(fpath, "rb") as fh:
                        st.download_button(
                            f"\u2b07 {f}", fh, file_name=f, key=f"dl_{f}",
                            use_container_width=True
                        )
                st.divider()

    st.subheader("Example questions")
    for q in EXAMPLE_QUESTIONS:
        if st.button(q, use_container_width=True):
            st.session_state.prefill = q

    st.divider()
    if st.button("New Session", use_container_width=True, type="secondary"):
        st.session_state.clear()
        st.rerun()

# ── Session init ──────────────────────────────────────────────────────────────
if "session" not in st.session_state:
    st.session_state.session = create_session()
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

# ── Render existing history ───────────────────────────────────────────────────
for entry in st.session_state.chat_history:
    with st.chat_message(entry["role"]):
        if entry["role"] == "assistant":
            render_assistant_entry(entry)
        else:
            st.markdown(entry["content"])

# ── Chat input ────────────────────────────────────────────────────────────────
prefill = st.session_state.pop("prefill", None)
user_input = st.chat_input("Ask about customer journeys...") or prefill

if user_input:
    st.session_state.chat_history.append({"role": "user", "content": user_input})
    with st.chat_message("user"):
        st.markdown(user_input)

    with st.chat_message("assistant"):
        session = st.session_state.session
        initial_state = {
            "messages": [HumanMessage(content=user_input)],
            **session,
        }

        agent_trace: list[str] = []
        accumulated: dict = {}

        with st.status("Running agents...", expanded=True) as status_box:
            for event in graph.stream(initial_state, stream_mode="updates"):
                node_name = list(event.keys())[0]
                node_delta = event[node_name]

                if node_name in AGENT_LABELS:
                    status_box.write(f"\u2713 {AGENT_LABELS[node_name]}")
                    agent_trace.append(AGENT_LABELS[node_name].split(" \u2014")[0])

                # Accumulate non-message fields from each node's delta
                for k, v in node_delta.items():
                    if k != "messages" and v is not None:
                        accumulated[k] = v
                # Accumulate messages separately
                for msg in node_delta.get("messages", []):
                    accumulated.setdefault("messages", []).append(msg)

            status_box.update(label="Done", state="complete", expanded=False)

        # Build the entry dict for rendering + history
        all_messages = initial_state["messages"] + accumulated.get("messages", [])
        csv_paths = accumulated.get("csv_paths", [])
        chart_paths = accumulated.get("chart_paths", [])

        entry = {
            "role": "assistant",
            "content": _get_final_text(all_messages),
            "agent_trace": agent_trace,
            "sql_query": _extract_sql_from_messages(all_messages),
            "csv_path": csv_paths[-1] if csv_paths else None,
            "eda_code": accumulated.get("eda_code", []),
            "charts": chart_paths,
            "report": None,
        }

        # Load report if it was written this turn
        report_path = os.path.join(session["session_dir"], "report.md")
        if os.path.exists(report_path):
            with open(report_path, encoding="utf-8") as f:
                entry["report"] = f.read()

        # Update session state so next turn has the right context
        st.session_state.session.update({
            "csv_paths": csv_paths,
            "chart_paths": chart_paths,
            "eda_results": accumulated.get("eda_results", {}),
            "sql_summaries": accumulated.get("sql_summaries", []),
            "eda_code": accumulated.get("eda_code", []),
        })

        render_assistant_entry(entry)
        st.session_state.chat_history.append(entry)
