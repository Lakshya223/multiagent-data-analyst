import os
import io
import re
import json
import contextlib
from langchain_core.messages import HumanMessage, AIMessage
from backend.config import llm
from backend.agents.state import AgentState
from backend.agents.context import build_shared_context
from backend.logger import get_logger

log = get_logger(__name__)

# Safety cap — the LLM's {"done": true} signal drives early exit
MAX_EDA_STEPS = 12


def _load_prompt() -> str:
    prompt_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts", "eda_agent.txt")
    with open(prompt_path, encoding="utf-8") as f:
        return f.read()


def _extract_code_block(text: str) -> str | None:
    """Extract the first python/plain code block from an LLM response."""
    match = re.search(r"```(?:python)?\s*(.*?)```", text, re.DOTALL)
    if match:
        code = match.group(1).strip()
        return code if code else None
    return None


def _extract_narrative(text: str) -> str:
    """Strip code blocks and done-JSON, return the remaining narrative text."""
    cleaned = re.sub(r"```.*?```", "", text, flags=re.DOTALL)
    cleaned = re.sub(r'\{[^{}]*"done"[^{}]*\}', "", cleaned)
    lines = [l.strip() for l in cleaned.split("\n") if l.strip()]
    return " ".join(lines)


def _is_done(text: str) -> bool:
    """Return True if the LLM signals it is finished analyzing."""
    match = re.search(r'\{[^{}]*"done"[^{}]*\}', text, re.DOTALL)
    if match:
        try:
            return bool(json.loads(match.group()).get("done"))
        except json.JSONDecodeError:
            pass
    return False


def _exec_code(code: str, session_dir: str, namespace: dict) -> dict:
    """Execute a code block in the shared namespace; capture stdout, errors, and charts."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    stdout_capture = io.StringIO()
    chart_path = None
    error = None

    try:
        with contextlib.redirect_stdout(stdout_capture):
            exec(code, namespace)  # noqa: S102
        if plt.get_fignums():
            existing = [f for f in os.listdir(session_dir) if f.startswith("chart_") and f.endswith(".png")]
            chart_name = f"chart_{len(existing) + 1}.png"
            chart_path = os.path.join(session_dir, chart_name)
            plt.savefig(chart_path, bbox_inches="tight", dpi=150)
            plt.close("all")
    except Exception as e:
        error = str(e)
    finally:
        plt.close("all")

    return {
        "output": stdout_capture.getvalue(),
        "chart_path": chart_path,
        "error": error,
    }


def _inspect_dataframe(df) -> str:
    """Build a compact inspection string for the LLM (schema + sample + nulls)."""
    import pandas as pd
    lines = [
        f"Shape: {df.shape[0]} rows × {df.shape[1]} columns",
        f"Columns and dtypes:\n{df.dtypes.to_string()}",
        f"Null counts:\n{df.isnull().sum().to_string()}",
        f"Sample (first 5 rows):\n{df.head(5).to_string(index=False)}",
    ]
    try:
        numeric_cols = df.select_dtypes(include="number").columns.tolist()
        if numeric_cols:
            lines.append(f"Numeric summary:\n{df[numeric_cols].describe().to_string()}")
    except Exception:
        pass
    return "\n\n".join(lines)


def eda_agent_node(state: AgentState) -> dict:
    import pandas as pd
    import numpy as np
    import matplotlib.pyplot as plt

    log.info("━━━ EDA AGENT ━━━")
    session_dir = state["session_dir"]
    csv_paths = state.get("csv_paths", [])
    latest_csv = csv_paths[-1] if csv_paths else ""
    user_question = state.get("user_question", "")
    effective_task = (state.get("supervisor_task", "") or "").strip() or user_question

    log.info(f"CSV to analyse: {latest_csv or '(none)'}")
    if not latest_csv or not os.path.exists(latest_csv):
        log.warning("No CSV available — skipping EDA")
        return {
            "messages": [AIMessage(content="EDA Agent: No CSV file available to analyze.")],
            "chart_paths": state.get("chart_paths", []),
            "eda_results": {},
            "eda_inferences": state.get("eda_inferences", []),
        }

    df = pd.read_csv(latest_csv)
    log.info(f"DataFrame loaded — shape: {df.shape} | columns: {list(df.columns)}")

    system_prompt = _load_prompt()
    shared_context = build_shared_context(state)
    df_inspection = _inspect_dataframe(df)

    # Shared Python namespace — variables persist across all steps
    shared_ns = {"pd": pd, "np": np, "plt": plt, "df": df.copy(), "json": json, "os": os}

    chart_paths = list(state.get("chart_paths", []))
    eda_inferences = list(state.get("eda_inferences", []))
    eda_code = list(state.get("eda_code", []))

    # step_log entries: {"step": N, "code": str, "output": str, "error": str, "chart": str}
    step_log: list[dict] = []
    final_narrative = ""

    for step in range(1, MAX_EDA_STEPS + 1):
        log.info(f"EDA step {step}/{MAX_EDA_STEPS}...")

        # Build the history of prior steps for the LLM
        prior_steps_text = ""
        if step_log:
            parts = []
            for entry in step_log:
                part = f"Step {entry['step']}:\nCode:\n```python\n{entry['code']}\n```"
                if entry.get("output"):
                    part += f"\nOutput:\n{entry['output'][:600]}"
                if entry.get("error"):
                    part += f"\nError: {entry['error']}"
                if entry.get("chart"):
                    part += f"\nChart saved: {os.path.basename(entry['chart'])}"
                parts.append(part)
            prior_steps_text = "\n\n---\n\n".join(parts)

        prompt = (
            f"{system_prompt}\n\n"
            f"=== Dataset ===\n{df_inspection}\n\n"
            f"=== Session Context ===\n{shared_context}\n\n"
            f"=== Task ===\n{effective_task}\n\n"
            + (f"=== Work done so far (steps 1–{step - 1}) ===\n{prior_steps_text}\n\n" if prior_steps_text else "")
            + f"=== Your turn (step {step}) ===\n"
            f"Write the next Python code block to continue your analysis, OR if the question is "
            f"fully answered, write a concise narrative summary and end with "
            f'{"{"}"done": true{"}"}  (no code block needed when done).'
        )

        response = llm.invoke([HumanMessage(content=prompt)])
        response_text = response.content

        # Check for done signal first
        if _is_done(response_text):
            final_narrative = _extract_narrative(response_text)
            log.info(f"EDA agent signalled done at step {step}. Narrative: {final_narrative[:120]!r}")
            break

        code = _extract_code_block(response_text)
        if not code:
            # No code block and no done signal — treat narrative as final
            final_narrative = _extract_narrative(response_text)
            log.warning(f"Step {step}: no code block and no done signal — treating as done.")
            break

        log.info(f"Executing code block ({len(code)} chars)...")
        exec_result = _exec_code(code, session_dir, shared_ns)
        eda_code.append(code)

        entry = {"step": step, "code": code, "output": "", "error": None, "chart": None}

        if exec_result["output"]:
            log.info(f"Step {step} output:\n{exec_result['output'][:300]}")
            entry["output"] = exec_result["output"]

        if exec_result["chart_path"]:
            log.info(f"Chart saved → {exec_result['chart_path']}")
            chart_paths.append(exec_result["chart_path"])
            entry["chart"] = exec_result["chart_path"]

        if exec_result["error"]:
            log.warning(f"Step {step} error: {exec_result['error']}")
            entry["error"] = exec_result["error"]

        step_log.append(entry)
    else:
        # Safety cap reached — extract narrative from last response if available
        final_narrative = _extract_narrative(response_text)
        log.warning(f"EDA safety cap ({MAX_EDA_STEPS} steps) reached.")

    steps_run = len(step_log) + (1 if final_narrative else 0)
    log.info(f"EDA complete — {steps_run} step(s), {len(chart_paths)} chart(s)")

    if final_narrative:
        eda_inferences.append(final_narrative)

    eda_results = {
        "chart_paths": chart_paths,
        "key_findings": eda_inferences,
        "steps_completed": steps_run,
    }

    summary_text = (
        f"EDA complete ({steps_run} step(s), {len(chart_paths)} chart(s)).\n"
        + (f"Analysis summary:\n{final_narrative}\n" if final_narrative else "")
        + f"Charts: {chart_paths}"
    )

    return {
        "messages": [AIMessage(content=summary_text)],
        "chart_paths": chart_paths,
        "eda_results": eda_results,
        "eda_code": eda_code,
        "eda_inferences": eda_inferences,
    }
