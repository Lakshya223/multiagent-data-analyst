from typing import Annotated, Literal
from typing_extensions import TypedDict
from langgraph.graph.message import add_messages
from pydantic import BaseModel


class AgentState(TypedDict):
    messages: Annotated[list, add_messages]  # full conversation + agent messages
    session_id: str
    session_dir: str
    csv_paths: list[str]            # CSVs saved by SQL Agent (accumulates across calls)
    chart_paths: list[str]          # PNGs saved by EDA Agent (accumulates across rounds)
    eda_results: dict               # structured JSON output from EDA Agent
    sql_summaries: list[str]        # text summaries returned by SQL Agent (accumulates)
    csv_schemas: list[dict]         # per-CSV metadata: {filename, columns, dtypes, row_count}
    eda_code: list[str]             # code blocks executed by EDA Agent
    eda_inferences: list[str]       # per-round EDA narrative texts (accumulates)
    iteration: int                  # legacy refinement counter
    agent_call_count: int           # supervisor increments on every routing decision (cap: 8)
    supervisor_task: str            # specific instruction from supervisor to next agent
    hypothesis_data_request: str    # set by hypothesis_agent when it needs more data; cleared by supervisor
    user_question: str
    next_agent: str                 # routing decision from supervisor


class RouteDecision(BaseModel):
    next: Literal["sql_agent", "eda_agent", "hypothesis_agent", "fallback", "FINISH"]
    reason: str
    task: str = ""                  # specific instruction for the next agent
