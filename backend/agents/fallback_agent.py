from langchain_core.messages import SystemMessage, AIMessage, HumanMessage
from backend.config import llm
from backend.agents.state import AgentState
from backend.logger import get_logger

log = get_logger(__name__)

_FALLBACK_PROMPT = (
    "You are a helpful conversational assistant embedded in a retail analytics system called Lens. "
    "Your role:\n"
    "1. If the user is greeting you or making small talk, respond warmly and briefly.\n"
    "2. If the user is asking about the conversation — e.g. 'what did I ask?', "
    "'what was my previous question?', 'remind me what we discussed' — look at the "
    "conversation history provided and answer directly from it.\n"
    "3. If the user asks something genuinely outside retail analytics, politely explain "
    "what Lens can help with and suggest 2-3 example questions:\n"
    "   - 'What are the top product categories by revenue?'\n"
    "   - 'What is the return rate by purchase channel?'\n"
    "   - 'Which customers have the highest lifetime value?'\n"
    "Keep responses concise and friendly."
)


def fallback_node(state: AgentState) -> dict:
    log.warning("━━━ FALLBACK AGENT ━━━")
    # Include conversation history so the LLM can answer memory-recall questions
    history_msgs = [
        msg for msg in state["messages"]
        if isinstance(msg, (HumanMessage, AIMessage))
        and not (isinstance(msg, AIMessage) and msg.content.startswith("[Supervisor]"))
    ]
    messages = [SystemMessage(content=_FALLBACK_PROMPT)] + history_msgs
    response = llm.invoke(messages)
    return {"messages": [AIMessage(content=response.content)]}
