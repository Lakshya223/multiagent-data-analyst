import os
import uuid


def create_session() -> dict:
    """Create a new session folder and return initial session state.

    Uses /tmp/sessions on Cloud Run (ephemeral but writable); falls back to
    a local sessions/ directory in development.
    """
    session_id = str(uuid.uuid4())[:8]
    # /tmp is always writable on Cloud Run; use local sessions/ when running locally
    if os.path.exists("/tmp"):
        base_dir = "/tmp/sessions"
    else:
        base_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "sessions")
    session_dir = os.path.join(base_dir, session_id)
    os.makedirs(session_dir, exist_ok=True)
    return {
        "session_id": session_id,
        "session_dir": session_dir,
        "csv_paths": [],
        "chart_paths": [],
        "eda_results": {},
        "sql_summaries": [],
        "eda_code": [],
        "iteration": 0,
        "user_question": "",
    }
