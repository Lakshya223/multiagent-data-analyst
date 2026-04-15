from langgraph.graph import StateGraph, START, END
from backend.agents.state import AgentState
from backend.agents.supervisor import supervisor_node, route_supervisor
from backend.agents.sql_agent import sql_agent_node
from backend.agents.eda_agent import eda_agent_node
from backend.agents.hypothesis_agent import hypothesis_agent_node, route_hypothesis
from backend.agents.fallback_agent import fallback_node

graph_builder = StateGraph(AgentState)

# Register nodes
graph_builder.add_node("supervisor", supervisor_node)
graph_builder.add_node("sql_agent", sql_agent_node)
graph_builder.add_node("eda_agent", eda_agent_node)
graph_builder.add_node("hypothesis_agent", hypothesis_agent_node)
graph_builder.add_node("fallback", fallback_node)

# Entry point
graph_builder.add_edge(START, "supervisor")

# Supervisor routes conditionally to any agent
graph_builder.add_conditional_edges(
    "supervisor",
    route_supervisor,
    {
        "sql_agent": "sql_agent",
        "eda_agent": "eda_agent",
        "hypothesis_agent": "hypothesis_agent",
        "fallback": "fallback",
        "FINISH": END,
    },
)

# Workers return to supervisor for next routing decision
graph_builder.add_edge("sql_agent", "supervisor")
graph_builder.add_edge("eda_agent", "supervisor")

# Hypothesis: routes back to supervisor if it needs more data, otherwise END
graph_builder.add_conditional_edges(
    "hypothesis_agent",
    route_hypothesis,
    {"supervisor": "supervisor", END: END},
)

# Fallback goes straight to END
graph_builder.add_edge("fallback", END)

graph = graph_builder.compile()
