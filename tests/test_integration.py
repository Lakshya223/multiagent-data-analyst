"""
Integration tests for the Retail Customer Journey Intelligence Agent.

These tests invoke the LangGraph graph directly (no HTTP) against live BigQuery.
Each test takes ~30-60s. Run with:
    venv\\Scripts\\pytest tests/test_integration.py -v -s

Note: The three BigQuery tables (transactions, clickstream, email_data) do not
share a common join key and must be queried independently:
  - transaction_data: AMPERITY_ID (UUID strings)
  - clickstream_session_data: CUSTOMER_ID (INT64)
  - email_data: SUBSCRIBERKEY (email address strings)
"""
import os
import uuid
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from backend.agents.graph import graph

SESSIONS_DIR = Path(__file__).parent.parent / "sessions"


def make_initial_state(question: str, session_id: str) -> dict:
    session_dir = str(SESSIONS_DIR / session_id)
    os.makedirs(session_dir, exist_ok=True)
    return {
        "messages": [{"role": "user", "content": question}],
        "session_id": session_id,
        "session_dir": session_dir,
        "csv_paths": [],
        "chart_paths": [],
        "sql_summaries": [],
        "eda_results": {},
        "eda_code": [],
        "iteration": 0,
        "user_question": question,
        "next_agent": "",
    }


def test_email_campaign_analysis():
    """
    Test 1: Email table analysis - campaign open rates from email_data.
    Expected path: supervisor -> sql_agent -> supervisor -> eda_agent -> supervisor -> hypothesis_agent -> END
    """
    session_id = f"test_{uuid.uuid4().hex[:8]}"
    state = make_initial_state(
        "What are the top email campaigns by open rate? "
        "Show campaign name, total emails sent, open count, and open rate sorted descending.",
        session_id,
    )

    result = graph.invoke(state)

    assert result["csv_paths"], "SQL agent should have saved a CSV with email campaign data"
    assert result["chart_paths"], "EDA agent should have produced a chart"

    report = Path(result["session_dir"]) / "report.md"
    assert report.exists(), "Hypothesis agent should have written report.md"

    report_text = report.read_text(encoding="utf-8")
    assert len(report_text) > 100, "report.md should contain meaningful content"


def test_clickstream_funnel():
    """
    Test 2: Clickstream funnel analysis.
    Targets clickstream_session_data (CART_FLAG, CHECKOUT_FLAG, ORDER_FLAG, DEVICE_TYPE).
    Expected path: supervisor -> sql_agent -> supervisor -> eda_agent -> supervisor -> hypothesis_agent -> END
    """
    session_id = f"test_{uuid.uuid4().hex[:8]}"
    state = make_initial_state(
        "What is the conversion funnel from landing page to purchase? "
        "Show cart, checkout, and order rates by device type.",
        session_id,
    )

    result = graph.invoke(state)

    assert result["csv_paths"], "SQL agent should have saved a CSV with funnel data"
    assert result["chart_paths"], "EDA agent should have produced a funnel chart"

    report = Path(result["session_dir"]) / "report.md"
    assert report.exists(), "Hypothesis agent should have written report.md"

    report_text = report.read_text(encoding="utf-8")
    assert len(report_text) > 100, "report.md should contain meaningful content"


def test_fallback_off_topic():
    """
    Test 3: Fallback agent - off-topic question should not trigger any data pipeline.
    Expected path: supervisor -> fallback -> END
    No CSV, no chart, no report.md. Response redirects to retail topics.
    """
    session_id = f"test_{uuid.uuid4().hex[:8]}"
    state = make_initial_state("What is the capital of France?", session_id)

    result = graph.invoke(state)

    assert not result["csv_paths"], "Fallback should not run SQL agent"
    assert not result["chart_paths"], "Fallback should not run EDA agent"

    report = Path(result["session_dir"]) / "report.md"
    assert not report.exists(), "Fallback should not produce report.md"

    last_msg = result["messages"][-1]
    content = last_msg.content if hasattr(last_msg, "content") else last_msg.get("content", "")
    retail_keywords = ["retail", "analytics", "customer", "campaign", "revenue", "purchase"]
    assert any(w in content.lower() for w in retail_keywords), (
        f"Fallback response should redirect to retail topics. Got: {content[:200]}"
    )
