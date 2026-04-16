import os
import re
import json
from langchain_core.messages import HumanMessage, AIMessage
from backend.config import llm as _default_llm, bq_client
from backend.agents.state import AgentState
from backend.agents.context import build_shared_context
from backend.logger import get_logger

log = get_logger(__name__)

# Prefix used to mark infeasible tasks in sql_summaries so other agents can detect them
INFEASIBLE_PREFIX = "INFEASIBLE:"


def _load_prompt() -> str:
    base_dir = os.path.dirname(os.path.dirname(__file__))
    prompt_path = os.path.join(base_dir, "prompts", "sql_agent.txt")
    schema_path = os.path.join(base_dir, "docs", "schema.txt")
    with open(prompt_path, encoding="utf-8") as f:
        template = f.read()
    with open(schema_path, encoding="utf-8") as f:
        schema = f.read()
    return template.replace("{schema}", schema)


def _check_feasibility(task: str, schema_prompt: str, llm=None) -> dict:
    """
    Ask the LLM whether the task can be answered using the available table schemas.
    Returns {"feasible": bool, "reason": str}.
    """
    check_prompt = (
        f"{schema_prompt}\n\n"
        f"Task to evaluate: \"{task}\"\n\n"
        f"Based ONLY on the table schemas listed above, decide:\n"
        f"1. Can this task be answered with the available columns?\n"
        f"2. If yes — which table(s) and column(s) are needed?\n"
        f"3. If no — what specific data is missing?\n\n"
        f"Important rules:\n"
        f"- The three tables CANNOT be joined (no shared key). Evaluate each independently.\n"
        f"- If the task requires a column that does not exist in any table, it is NOT feasible.\n"
        f"- If the task requires joining tables that cannot be joined, it is NOT feasible.\n"
        f"- If the task can be reasonably approximated with available columns, it IS feasible.\n\n"
        f"Return ONLY this JSON (no markdown, no explanation):\n"
        f'{{"feasible": true_or_false, "reason": "one sentence explaining why or why not"}}'
    )
    response = (llm or _default_llm).invoke([HumanMessage(content=check_prompt)])
    raw = response.content.strip()
    match = re.search(r'\{.*?\}', raw, re.DOTALL)
    if match:
        try:
            result = json.loads(match.group())
            return {
                "feasible": bool(result.get("feasible", True)),
                "reason": result.get("reason", ""),
            }
        except json.JSONDecodeError:
            pass
    # Default to feasible if parsing fails — don't block on a bad check response
    return {"feasible": True, "reason": ""}


def _extract_sql(text: str) -> str | None:
    """Extract SQL from a code block or plain text."""
    match = re.search(r"```sql\s*(.*?)```", text, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(1).strip()
    match = re.search(r"```\s*(SELECT.*?)```", text, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(1).strip()
    match = re.search(r"(SELECT\s+.*?;?)\s*$", text, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return None


def _run_query(query: str, session_dir: str) -> dict:
    """Execute a BigQuery query, round numeric values, and save result to CSV."""
    try:
        df = bq_client.query(query).to_dataframe()
    except Exception as e:
        return {"error": str(e), "csv_path": None, "row_count": 0}

    # Round all numeric columns to 2 decimal places
    numeric_cols = df.select_dtypes(include="number").columns
    if len(numeric_cols):
        df[numeric_cols] = df[numeric_cols].round(2)

    existing = [f for f in os.listdir(session_dir) if f.startswith("query_") and f.endswith(".csv")]
    csv_name = f"query_{len(existing) + 1}.csv"
    csv_path = os.path.join(session_dir, csv_name)
    df.to_csv(csv_path, index=False)

    return {
        "csv_path": csv_path,
        "row_count": len(df),
        "columns": list(df.columns),
        "dtypes": df.dtypes.astype(str).to_dict(),
        "preview": df.head(5).to_string(index=False),
        "error": None,
    }


def sql_agent_node(state: AgentState) -> dict:
    log.info("━━━ SQL AGENT ━━━")
    llm = state.get("llm", _default_llm)
    session_dir = state["session_dir"]

    # Prefer supervisor's specific task; fall back to original user question
    effective_task = (state.get("supervisor_task", "") or "").strip()
    user_question = state.get("user_question", "")
    if not effective_task:
        effective_task = user_question
        if not effective_task:
            for msg in state["messages"]:
                if isinstance(msg, HumanMessage) and not msg.content.startswith("[Context]"):
                    effective_task = msg.content
                    break

    log.info(f"Task: {effective_task[:120]}")

    prompt = _load_prompt()
    shared_context = build_shared_context(state)

    # Step 0: Schema feasibility check — bail early if data cannot answer the question
    log.info("Checking schema feasibility...")
    feasibility = _check_feasibility(effective_task, prompt, llm=llm)
    log.info(f"Feasible: {feasibility['feasible']} | Reason: {feasibility['reason']}")

    if not feasibility["feasible"]:
        reason = feasibility["reason"]
        log.warning(f"Task is not feasible with available data: {reason}")
        infeasible_summary = f"{INFEASIBLE_PREFIX} {reason}"
        sql_summaries = list(state.get("sql_summaries", []))
        sql_summaries.append(infeasible_summary)
        return {
            "messages": [AIMessage(content=f"SQL Agent: Cannot answer this question with available data.\n{reason}")],
            "csv_paths": state.get("csv_paths", []),
            "sql_summaries": sql_summaries,
            "iteration": state.get("iteration", 0) + 1,
        }

    # Step 1: LLM generates SQL
    full_prompt = (
        f"{prompt}\n\n"
        f"=== Session context ===\n{shared_context}\n\n"
        f"Task: {effective_task}\n\n"
        f"Write the SQL query to answer this task. "
        f"If the session context shows this data has already been fetched, write a more specific or complementary query instead."
    )
    response = llm.invoke([HumanMessage(content=full_prompt)])
    sql = _extract_sql(response.content)

    log.info(f"Generated SQL:\n{sql or '(none extracted)'}")
    if not sql:
        log.warning("Could not extract SQL from LLM response")
        error_msg = f"Could not extract SQL from response: {response.content[:300]}"
        return {
            "messages": [AIMessage(content=error_msg)],
            "csv_paths": state.get("csv_paths", []),
            "sql_summaries": state.get("sql_summaries", []),
            "iteration": state.get("iteration", 0) + 1,
        }

    # Step 2: Execute with retry on error
    result = _run_query(sql, session_dir)
    attempts = 1

    if result.get("error"):
        log.warning(f"BQ error (attempt {attempts}): {result['error']}")
    else:
        log.info(f"BQ query OK — {result['row_count']} rows, columns: {result.get('columns')}")

    while result.get("error") and attempts < 3:
        log.info(f"Retrying SQL (attempt {attempts + 1}/3)...")
        fix_prompt = (
            f"{prompt}\n\n"
            f"=== Session context ===\n{shared_context}\n\n"
            f"Task: {effective_task}\n\n"
            f"The previous SQL query failed:\n```sql\n{sql}\n```\n"
            f"Error: {result['error']}\n\n"
            f"Fix the query and rewrite it."
        )
        response = llm.invoke([HumanMessage(content=fix_prompt)])
        sql = _extract_sql(response.content) or sql
        result = _run_query(sql, session_dir)
        attempts += 1

    csv_paths = list(state.get("csv_paths", []))
    sql_summaries = list(state.get("sql_summaries", []))
    csv_schemas = list(state.get("csv_schemas", []))

    if result.get("error"):
        log.error(f"SQL Agent failed after {attempts} attempts. Last error: {result['error']}")
        summary = (
            f"Task: {effective_task}\n"
            f"SQL Agent failed after {attempts} attempts. Last error: {result['error']}"
        )
    else:
        log.info(f"CSV saved → {result['csv_path']}")
        csv_paths.append(result["csv_path"])
        summary = (
            f"Task: {effective_task}\n"
            f"Query returned {result['row_count']} rows.\n"
            f"Columns: {result['columns']}\n"
            f"Preview:\n{result['preview']}"
        )
        sql_summaries.append(summary)
        csv_schemas.append({
            "filename": os.path.basename(result["csv_path"]),
            "columns": result["columns"],
            "dtypes": result.get("dtypes", {}),
            "row_count": result["row_count"],
        })

    return {
        "messages": [
            AIMessage(content=f"SQL executed:\n```sql\n{sql}\n```\n\n{summary}")
        ],
        "csv_paths": csv_paths,
        "sql_summaries": sql_summaries,
        "csv_schemas": csv_schemas,
        "iteration": state.get("iteration", 0) + 1,
    }
