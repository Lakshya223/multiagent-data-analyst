import os
import warnings
from dotenv import load_dotenv
import vertexai
from langchain_google_vertexai import ChatVertexAI
from google.cloud import bigquery

# Suppress Pydantic V1 deprecation noise from langchain internals
warnings.filterwarnings("ignore", category=UserWarning, module="langchain_core")
warnings.filterwarnings("ignore", category=DeprecationWarning, module="langchain")

load_dotenv()

BQ_PROJECT = os.environ["BQ_PROJECT"]
BQ_DATASET = os.environ["BQ_DATASET"]
VERTEX_LOCATION = os.getenv("VERTEX_LOCATION", "us-central1")

# Vertex AI — uses GOOGLE_APPLICATION_CREDENTIALS service account for both BQ and Gemini
vertexai.init(project=BQ_PROJECT, location=VERTEX_LOCATION)

llm = ChatVertexAI(model="gemini-2.0-flash", temperature=0)


def get_llm(model: str = "gemini-2.0-flash") -> ChatVertexAI:
    """Return a ChatVertexAI instance for the requested model."""
    return ChatVertexAI(model=model, temperature=0)

bq_client = bigquery.Client(project=BQ_PROJECT)

# Table map — all 3 tables available in BigQuery
TABLE_MAP = {
    "transactions": f"{BQ_PROJECT}.retail.transaction_data",
    "clickstream":  f"{BQ_PROJECT}.retail.clickstream_session_data",
    "email":        f"{BQ_PROJECT}.retail.email_data",
}
