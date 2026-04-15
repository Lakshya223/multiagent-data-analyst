from backend.agents.state import AgentState

MAX_AGENT_CALLS = 8


def build_shared_context(state: AgentState) -> str:
    """
    Returns a formatted summary of the full session state.
    Injected into every agent's prompt so all agents share the same picture
    of what has been done and what remains.
    """
    lines = []

    call_count = state.get("agent_call_count", 0)
    lines.append(f"Agent calls used: {call_count}/{MAX_AGENT_CALLS}")

    user_question = state.get("user_question", "")
    if user_question:
        lines.append(f"\nOriginal user question: {user_question}")

    # --- Structured CSV schema block (never truncated) ---
    # This is the most important signal for routing: the supervisor needs to know
    # exactly what columns and dtypes are available before deciding to call EDA.
    csv_schemas = state.get("csv_schemas", [])
    if csv_schemas:
        lines.append(f"\nAvailable CSV data ({len(csv_schemas)} file(s)) — full schema:")
        for schema in csv_schemas:
            filename = schema.get("filename", "unknown")
            row_count = schema.get("row_count", "?")
            columns = schema.get("columns", [])
            dtypes = schema.get("dtypes", {})
            lines.append(f"  [{filename}] — {row_count} rows")
            for col in columns:
                dtype = dtypes.get(col, "unknown")
                lines.append(f"    • {col}  ({dtype})")
    else:
        lines.append("\nAvailable CSV data: none yet")

    # --- SQL query summaries (task + row count + preview) ---
    sql_summaries = state.get("sql_summaries", [])
    if sql_summaries:
        lines.append(f"\nSQL queries completed ({len(sql_summaries)}):")
        for i, s in enumerate(sql_summaries, 1):
            # Show more of the summary than before; schema is already shown above
            lines.append(f"  [{i}] {s[:500]}")
    else:
        lines.append("\nSQL queries completed: none yet")

    # --- EDA inferences ---
    eda_inferences = state.get("eda_inferences", [])
    if eda_inferences:
        lines.append(f"\nEDA analysis completed ({len(eda_inferences)} inference(s)):")
        for i, inf in enumerate(eda_inferences, 1):
            lines.append(f"  [{i}] {inf[:300]}")
    else:
        lines.append("\nEDA analysis completed: none yet")

    data_request = state.get("hypothesis_data_request", "")
    if data_request:
        lines.append(f"\n[!] Hypothesis agent previously requested more data: {data_request}")

    chart_paths = state.get("chart_paths", [])
    lines.append(f"\nCharts generated so far: {len(chart_paths)}")

    return "\n".join(lines)
