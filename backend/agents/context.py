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

    sql_summaries = state.get("sql_summaries", [])
    if sql_summaries:
        lines.append(f"\nSQL queries completed ({len(sql_summaries)}):")
        for i, s in enumerate(sql_summaries, 1):
            lines.append(f"  [{i}] {s[:300]}")
    else:
        lines.append("\nSQL queries completed: none yet")

    eda_inferences = state.get("eda_inferences", [])
    if eda_inferences:
        lines.append(f"\nEDA analysis completed ({len(eda_inferences)} inference(s)):")
        for i, inf in enumerate(eda_inferences, 1):
            lines.append(f"  [{i}] {inf[:200]}")
    else:
        lines.append("\nEDA analysis completed: none yet")

    data_request = state.get("hypothesis_data_request", "")
    if data_request:
        lines.append(f"\n[!] Hypothesis agent previously requested more data: {data_request}")

    csv_paths = state.get("csv_paths", [])
    chart_paths = state.get("chart_paths", [])
    lines.append(f"\nArtifacts so far: {len(csv_paths)} CSV(s), {len(chart_paths)} chart(s)")

    user_question = state.get("user_question", "")
    if user_question:
        lines.append(f"\nOriginal user question: {user_question}")

    return "\n".join(lines)
