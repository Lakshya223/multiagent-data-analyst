import os
import io
import json
import contextlib
from langchain_core.tools import tool


def make_eda_tool(csv_path: str, session_dir: str):
    """Return an execute_pandas_code tool with csv_path and session_dir pre-filled."""

    @tool
    def execute_pandas_code(code: str) -> str:
        """Execute Python pandas/matplotlib code for data analysis.

        The following are already available in the execution namespace — do NOT redefine them:
          - df: pandas DataFrame loaded from the CSV
          - pd: pandas
          - plt: matplotlib.pyplot

        Do NOT call pd.read_csv() or plt.show(). Just use df and plt directly.
        Any matplotlib figure you create will be saved automatically.

        Args:
            code: Python code string to execute.
        """
        import pandas as pd
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        namespace = {
            "pd": pd,
            "plt": plt,
            "df": pd.read_csv(csv_path),
        }

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

        return json.dumps({
            "output": stdout_capture.getvalue(),
            "chart_path": chart_path,
            "error": error,
        })

    return execute_pandas_code
