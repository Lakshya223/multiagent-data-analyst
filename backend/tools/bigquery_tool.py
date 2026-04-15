import os
import json
from langchain_core.tools import tool
from backend.config import bq_client


def make_sql_tool(session_dir: str):
    """Return a run_bigquery_sql tool with session_dir pre-filled via closure."""

    @tool
    def run_bigquery_sql(query: str) -> str:
        """Execute a BigQuery SQL query. Returns row count, columns, and a data preview.
        Use this whenever you need to retrieve data from BigQuery.

        Args:
            query: A valid BigQuery SQL query string.
        """
        try:
            df = bq_client.query(query).to_dataframe()
        except Exception as e:
            return json.dumps({"error": str(e), "query": query, "csv_path": None})

        existing = [f for f in os.listdir(session_dir) if f.startswith("query_") and f.endswith(".csv")]
        csv_name = f"query_{len(existing) + 1}.csv"
        csv_path = os.path.join(session_dir, csv_name)
        df.to_csv(csv_path, index=False)

        preview = df.head(5).to_string(index=False)
        return json.dumps({
            "csv_path": csv_path,
            "row_count": len(df),
            "columns": list(df.columns),
            "preview": preview,
            "error": None,
        })

    return run_bigquery_sql
