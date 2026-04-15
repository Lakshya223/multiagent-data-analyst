"""Google Cloud Storage helpers for session artifact persistence.

On Cloud Run, local files in /tmp are ephemeral and not shared between instances.
This module uploads session artifacts to GCS after analysis, and downloads them
on demand for the /artifact endpoint.

Set GCS_BUCKET env var to enable. If unset, GCS operations are no-ops (local dev).
"""
import os
from backend.logger import get_logger

log = get_logger(__name__)

GCS_BUCKET = os.getenv("GCS_BUCKET", "")


def _client():
    from google.cloud import storage
    return storage.Client()


def upload_session(session_id: str, session_dir: str) -> None:
    """Upload all files in session_dir to GCS under sessions/{session_id}/."""
    if not GCS_BUCKET:
        return
    try:
        client = _client()
        bucket = client.bucket(GCS_BUCKET)
        for filename in os.listdir(session_dir):
            local_path = os.path.join(session_dir, filename)
            if os.path.isfile(local_path):
                blob_name = f"sessions/{session_id}/{filename}"
                bucket.blob(blob_name).upload_from_filename(local_path)
                log.info(f"GCS upload: gs://{GCS_BUCKET}/{blob_name}")
    except Exception as e:
        log.error(f"GCS upload failed for session {session_id}: {e}")


def download_artifact(session_id: str, filename: str, dest_path: str) -> bool:
    """Download a single artifact from GCS to dest_path. Returns True on success."""
    if not GCS_BUCKET:
        return False
    try:
        client = _client()
        bucket = client.bucket(GCS_BUCKET)
        blob_name = f"sessions/{session_id}/{filename}"
        blob = bucket.blob(blob_name)
        if not blob.exists():
            return False
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        blob.download_to_filename(dest_path)
        log.info(f"GCS download: gs://{GCS_BUCKET}/{blob_name} → {dest_path}")
        return True
    except Exception as e:
        log.error(f"GCS download failed {session_id}/{filename}: {e}")
        return False
