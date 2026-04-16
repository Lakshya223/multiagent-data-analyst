import os
import json
import re
from langchain_core.messages import HumanMessage, AIMessage
from backend.config import llm, TABLE_MAP
from backend.agents.state import AgentState, RouteDecision
from backend.agents.context import build_shared_context, MAX_AGENT_CALLS
from backend.logger import get_logger

log = get_logger(__name__)


def _load_prompt() -> str:
    prompt_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts", "supervisor.txt")
    with open(prompt_path, encoding="utf-8") as f:
        return f.read()


def supervisor_node(state: AgentState) -> dict:
    log.info("━━━ SUPERVISOR ━━━")
    call_count = state.get("agent_call_count", 0)
    log.info(
        f"call_count={call_count} | CSVs={len(state.get('csv_paths', []))} | "
        f"Charts={len(state.get('chart_paths', []))} | "
        f"EDA rounds={len(state.get('eda_inferences', []))} | "
        f"data_request={'YES' if state.get('hypothesis_data_request') else 'no'}"
    )

    # Hard cap — force final route
    if call_count >= MAX_AGENT_CALLS:
        if state.get("sql_summaries") or state.get("eda_inferences"):
            next_agent = "hypothesis_agent"
            reason = f"Hard cap ({MAX_AGENT_CALLS} calls) reached — forcing final hypothesis."
            task = "Synthesize all available data into hypotheses now. Do not request more data."
        else:
            next_agent = "FINISH"
            reason = f"Hard cap ({MAX_AGENT_CALLS} calls) reached with no data — finishing."
            task = ""
        log.warning(f"HARD CAP reached → [{next_agent.upper()}]: {reason}")
        user_question = state.get("user_question", "")
        return {
            "messages": [AIMessage(content=f"[Supervisor] → {next_agent}: {reason}")],
            "next_agent": next_agent,
            "user_question": user_question,
            "supervisor_task": task,
            "agent_call_count": call_count + 1,
            "hypothesis_data_request": "",
        }

    # Capture user question on first pass — always use the LAST HumanMessage so that
    # conversation history prepended from prior turns does not override the current question.
    user_question = state.get("user_question", "")
    if not user_question:
        for msg in reversed(state["messages"]):
            if isinstance(msg, HumanMessage) and not msg.content.startswith("[Context]") and not msg.content.startswith("[Supervisor]"):
                user_question = msg.content
                break

    context = build_shared_context(state)
    system_prompt = _load_prompt()

    # Format conversation history (recent messages only to stay concise)
    history = ""
    for msg in state["messages"][-10:]:
        role = type(msg).__name__.replace("Message", "")
        content = msg.content if isinstance(msg.content, str) else str(msg.content)
        if content.strip():
            history += f"{role}: {content[:400]}\n\n"

    routing_request = (
        f"{system_prompt}\n\n"
        f"--- Current session state ---\n{context}\n\n"
        f"--- Original user question ---\n{user_question}\n\n"
        f"--- Recent conversation ---\n{history}\n"
        f"--- Your routing decision ---\n"
        f"Respond with ONLY a JSON object, no markdown, no explanation:\n"
        f'{{"next": "<sql_agent|eda_agent|hypothesis_agent|fallback|FINISH>", '
        f'"reason": "<one sentence>", '
        f'"task": "<specific instruction for the next agent>"}}'
    )

    response = llm.invoke([HumanMessage(content=routing_request)])

    # Parse JSON robustly
    raw = response.content.strip()
    match = re.search(r'\{.*?\}', raw, re.DOTALL)
    decision = None
    if match:
        try:
            data = json.loads(match.group())
            decision = RouteDecision(
                next=data["next"],
                reason=data.get("reason", ""),
                task=data.get("task", ""),
            )
        except (json.JSONDecodeError, KeyError, ValueError):
            pass

    if decision is None:
        decision = RouteDecision(next="sql_agent", reason="Fallback: could not parse routing response", task="")
        log.warning("Could not parse supervisor JSON — defaulting to sql_agent")

    log.info(f"→ Routing to: [{decision.next.upper()}] | {decision.reason}")
    if decision.task:
        log.info(f"   Task: {decision.task[:120]}")

    return {
        "messages": [AIMessage(content=f"[Supervisor] → {decision.next}: {decision.reason}")],
        "next_agent": decision.next,
        "user_question": user_question,
        "supervisor_task": decision.task,
        "agent_call_count": call_count + 1,
        "hypothesis_data_request": "",   # clear after reading
        "iteration": state.get("iteration", 0) + 1,
    }


def route_supervisor(state: AgentState) -> str:
    return state["next_agent"]
