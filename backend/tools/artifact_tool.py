import os
from langchain_core.tools import tool


@tool
def save_report(content: str, session_dir: str) -> str:
    """Save a markdown report string to the session folder as report.md.

    Args:
        content: Markdown string to write.
        session_dir: Path to the current session folder.

    Returns:
        Absolute path to the saved report file.
    """
    report_path = os.path.join(session_dir, "report.md")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(content)
    return report_path


@tool
def read_artifact(filepath: str) -> str:
    """Read and return the contents of a file from the session folder.

    Args:
        filepath: Absolute path to the file to read.

    Returns:
        File contents as a string, or an error message if not found.
    """
    try:
        with open(filepath, encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return f"File not found: {filepath}"
    except UnicodeDecodeError:
        return f"File is binary (e.g. PNG/image) and cannot be read as text: {filepath}"
