from langchain_core.messages import SystemMessage, AIMessage
from backend.config import llm
from backend.agents.state import AgentState
from backend.logger import get_logger

log = get_logger(__name__)

_FALLBACK_PROMPT = (
    "You are a helpful assistant embedded in a retail analytics system. "
    "The user has asked something outside the scope of retail customer journey analysis. "
    "Acknowledge this politely, explain what you can help with, and suggest 2-3 example questions they could ask."
)

_EXAMPLE_QUESTIONS = [
    "What are the top product categories by revenue?",
    "What is the return rate by purchase channel?",
    "Which store has the highest average order value?",
]


def fallback_node(state: AgentState) -> dict:
    log.warning("━━━ FALLBACK AGENT ━━━ (question out of scope)")
    messages = [SystemMessage(content=_FALLBACK_PROMPT)] + list(state["messages"])
    response = llm.invoke(messages)
    return {"messages": [AIMessage(content=response.content)]}
