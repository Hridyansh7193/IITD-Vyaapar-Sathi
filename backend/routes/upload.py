"""
routes/upload.py
================
CSV file upload endpoint (JWT-protected):
  POST /api/v1/upload/csv  → Upload, process, and store sales CSV
"""

import os
import uuid
import sys
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
import pandas as pd
import io

from dependencies import get_current_user
from models.user import User
from schemas.response import success_response
from config.settings import get_settings

# Setup sys.path for orchestration
ORCH_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "orchestration"))
if ORCH_DIR not in sys.path:
    sys.path.insert(0, ORCH_DIR)

from router import route_csv_processing

router = APIRouter(prefix="/upload", tags=["Upload"])
settings = get_settings()

ALLOWED_MIME = {"text/csv", "application/csv", "application/octet-stream"}
MAX_SIZE_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


@router.post("/csv", summary="Upload a sales CSV file for analysis")
async def upload_csv(
    file: UploadFile = File(..., description="CSV file with sales/inventory data"),
    current_user: User = Depends(get_current_user),
):
    """
    Accepts a CSV file, stores it in `.tmp/`, and uses the orchestration layer 
    to process it (clean, validate, persist, and compute analytics).
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted")

    contents = await file.read()
    if len(contents) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=413, detail=f"File too large. Max: {settings.MAX_UPLOAD_SIZE_MB}MB")

    # ── Temp Storage ──────────────────────────────────────────────────────────
    tmp_dir = settings.TMP_DIR
    os.makedirs(tmp_dir, exist_ok=True)
    tmp_path = os.path.join(tmp_dir, f"{uuid.uuid4().hex}.csv")

    with open(tmp_path, "wb") as f:
        f.write(contents)

    # ── Parse CSV ─────────────────────────────────────────────────────────────
    df = None
    for enc in ["utf-8", "utf-8-sig", "latin-1"]:
        try:
            df = pd.read_csv(io.StringIO(contents.decode(enc)))
            break
        except Exception:
            continue

    if df is None or df.empty:
        if os.path.exists(tmp_path): os.remove(tmp_path)
        raise HTTPException(status_code=422, detail="Empty or unreadable CSV")

    # ── Delegate to Orchestration Row ─────────────────────────────────────────
    try:
        result = route_csv_processing(df, current_user.id)
    except Exception as e:
        if os.path.exists(tmp_path): os.remove(tmp_path)
        raise HTTPException(status_code=500, detail=str(e))

    # Cleanup
    if os.path.exists(tmp_path): os.remove(tmp_path)

    result["metadata"] = {
        "filename": file.filename,
        "rows_processed": len(df),
    }

    return success_response(data=result, message=f"CSV processed effectively via orchestration.")
