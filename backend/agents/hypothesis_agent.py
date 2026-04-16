import os
import json
import re
from langchain_core.messages import HumanMessage, AIMessage
from backend.config import llm as _default_llm
from backend.agents.state import AgentState
from backend.agents.context import build_shared_context
from backend.agents.sql_agent import INFEASIBLE_PREFIX
from backend.logger import get_logger

log = get_logger(__name__)


def _load_prompt() -> str:
    prompt_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts", "hypothesis_agent.txt")
    with open(prompt_path, encoding="utf-8") as f:
        return f.read()


def route_hypothesis(state: AgentState):
    """Conditional edge: route back to supervisor if more data is needed, else END."""
    from langgraph.graph import END
    if state.get("hypothesis_data_request", ""):
        return "supervisor"
    return END


def _check_sufficiency(user_question: str, sql_summaries: list, eda_inferences: list, shared_context: str, llm=None) -> dict:
    """Ask LLM if available data is sufficient to form hypotheses."""
    context = (
        f"User question: '{user_question}'\n\n"
        f"=== Full session context ===\n{shared_context}\n\n"
        f"SQL summaries ({len(sql_summaries)}):\n" + "\n".join(sql_summaries[:3]) + "\n\n"
        f"EDA inferences ({len(eda_inferences)}):\n" + "\n".join(eda_inferences[:4]) + "\n\n"
        f"Is this data sufficient to form 2-3 meaningful, evidence-backed hypotheses?\n"
        f"Return ONLY this JSON (no markdown, no explanation):\n"
        f'{{"sufficient": true_or_false, "missing": "description of specific data needed, or null"}}'
    )
    response = (llm or _default_llm).invoke([HumanMessage(content=context)])
    raw = response.content.strip()
    match = re.search(r'\{.*?\}', raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    # Default: assume sufficient if we have any data at all
    has_data = bool(sql_summaries or eda_inferences)
    return {"sufficient": has_data, "missing": None}


def hypothesis_agent_node(state: AgentState) -> dict:
    log.info("━━━ HYPOTHESIS AGENT ━━━")
    llm = state.get("llm", _default_llm)
    session_dir = state["session_dir"]
    sql_summaries = state.get("sql_summaries", [])
    eda_inferences = state.get("eda_inferences", [])
    eda_results = state.get("eda_results", {})
    user_question = state.get("user_question", "")
    agent_call_count = state.get("agent_call_count", 0)

    log.info(
        f"sql_summaries={len(sql_summaries)} | eda_inferences={len(eda_inferences)} | "
        f"agent_call_count={agent_call_count}"
    )

    supervisor_task = (state.get("supervisor_task", "") or "").strip()
    force_finish = "do not request more data" in supervisor_task.lower()

    shared_context = build_shared_context(state)

    # Hard stop: if ALL sql_summaries are INFEASIBLE markers and there is no EDA, the question
    # cannot be answered — return a clear explanation instead of fabricating hypotheses.
    real_sql = [s for s in sql_summaries if not s.startswith(INFEASIBLE_PREFIX)]
    infeasible_reasons = [s[len(INFEASIBLE_PREFIX):].strip() for s in sql_summaries if s.startswith(INFEASIBLE_PREFIX)]

    if not real_sql and not eda_inferences:
        reason = infeasible_reasons[0] if infeasible_reasons else "The available data does not contain the information needed to answer this question."
        log.warning(f"No usable data — skipping hypothesis generation. Reason: {reason}")
        cannot_answer = (
            f"I cannot generate hypotheses for this question because the required data is not available.\n\n"
            f"**Reason:** {reason}\n\n"
            f"**Available data sources:**\n"
            f"- `transaction_data` — orders, revenue, returns, discounts, product categories\n"
            f"- `clickstream_session_data` — web sessions, cart/checkout/order events, device types\n"
            f"- `email_data` — campaign sends, opens, clicks, bounces, unsubscribes\n\n"
            f"Please ask a question that can be answered using the columns in these tables."
        )
        return {
            "messages": [AIMessage(content=cannot_answer)],
            "hypothesis_data_request": "",
        }

    # Sufficiency check — skip only if we haven't been force-called by cap
    if not force_finish:
        log.info("Checking data sufficiency...")
        sufficiency = _check_sufficiency(user_question, real_sql, eda_inferences, shared_context, llm=llm)
        log.info(f"Sufficient: {sufficiency.get('sufficient')} | Missing: {sufficiency.get('missing')}")

        if not sufficiency.get("sufficient") and sufficiency.get("missing"):
            missing = sufficiency["missing"]
            log.warning(f"Insufficient data — requesting: {missing}")
            return {
                "messages": [AIMessage(content=f"[Hypothesis] Need more data: {missing}")],
                "hypothesis_data_request": missing,
            }

    # Generate full hypothesis report using only real (non-infeasible) SQL summaries
    prompt = _load_prompt()
    context = (
        f"{prompt}\n\n"
        f"=== Full session context ===\n{shared_context}\n\n"
        f"Original question: '{user_question}'\n\n"
        f"SQL Data Summaries:\n" + "\n".join(real_sql) + "\n\n"
        f"EDA Inferences:\n" + "\n".join(eda_inferences) + "\n\n"
        f"EDA Findings: {json.dumps(eda_results, indent=2)}\n\n"
        f"Write the full markdown report now. Only cite evidence that is present in the data above. "
        f"Do not speculate or fabricate numbers not in the summaries."
    )

    log.info(f"Generating hypothesis report (sql={len(sql_summaries)}, eda_rounds={len(eda_inferences)})...")
    response = llm.invoke([HumanMessage(content=context)])
    report_content = response.content
    log.info(f"Report generated — {len(report_content)} chars")

    # Save report to session folder
    report_path = os.path.join(session_dir, "report.md")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report_content)
    log.info(f"Report saved → {report_path}")

    # Extract summary section (## Summary)
    lines = report_content.split("\n")
    summary_lines = []
    in_summary = False
    for line in lines:
        stripped = line.lower().strip()
        if stripped in ("## summary", "## executive summary"):
            in_summary = True
        elif in_summary and line.startswith("## ") and stripped not in ("## summary", "## executive summary"):
            break
        if in_summary:
            summary_lines.append(line)

    executive_summary = "\n".join(summary_lines).strip() if summary_lines else report_content[:800]

    return {
        "messages": [AIMessage(content=executive_summary)],
        "hypothesis_data_request": "",   # clear — we're done
    }
