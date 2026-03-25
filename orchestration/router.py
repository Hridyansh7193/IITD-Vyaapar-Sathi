"""
orchestration/router.py
========================
Request routing and decision logic layer.
Determines which execution module to invoke based on request context.
This keeps route handlers thin — they call orchestration, which decides what runs.
"""

import os
import sys
import pandas as pd
from enum import Enum

# Pull in the execution layer
EXECUTION_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "execution"))
if EXECUTION_DIR not in sys.path:
    sys.path.insert(0, EXECUTION_DIR)


class DataSource(str, Enum):
    SUPABASE = "supabase"
    LOCAL_FILE = "local_file"
    DATAFRAME = "dataframe"


def route_analytics_request(user_id: str, source: DataSource = DataSource.SUPABASE) -> dict:
    """
    Routes an analytics request to the correct execution module.
    
    Decision logic:
    - SUPABASE → fetch from DB then compute
    - DATAFRAME → compute directly from in-memory DataFrame
    
    Args:
        user_id: The authenticated user's ID.
        source: Where to source the data from.
    
    Returns:
        dict: Full analytics result from the engine.
    """
    from analytics_engine import compute_analytics

    if source == DataSource.SUPABASE:
        from dotenv import load_dotenv
        load_dotenv()
        from supabase import create_client
        sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
        response = sb.table("sales_data").select("*").eq("user_id", user_id).execute()
        if not response.data:
            return {"message": "No data. Upload a CSV first.", "stats": {}}
        df = pd.DataFrame(response.data)
        return compute_analytics(df)

    raise ValueError(f"Unsupported data source: {source}")


def route_csv_processing(df: pd.DataFrame, user_id: str) -> dict:
    """
    Routes a CSV DataFrame to the csv_processor execution script for
    cleaning, validation, storage, and analytics computation.
    """
    from csv_processor import process_and_store
    return process_and_store(df, user_id)


def route_report_generation(user_id: str, report_type: str, format: str) -> bytes | str:
    """
    Routes a report generation request.
    Fetches data from Supabase, then delegates to the appropriate format handler.
    
    Returns:
        bytes: If format == 'pdf'
        str:   If format == 'csv'
    """
    from dotenv import load_dotenv
    load_dotenv()
    from supabase import create_client
    import io

    sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
    response = sb.table("sales_data").select("*").eq("user_id", user_id).execute()
    
    if not response.data:
        raise ValueError("No data found for this user.")

    df = pd.DataFrame(response.data)

    if format.lower() == "pdf":
        return _generate_pdf(df, report_type)
    else:
        stream = io.StringIO()
        df.to_csv(stream, index=False)
        return stream.getvalue()


def _generate_pdf(df: pd.DataFrame, report_type: str) -> bytes:
    """Creates a PDF report from the DataFrame using fpdf2."""
    from fpdf import FPDF
    import io

    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("helvetica", "B", 16)
    pdf.cell(0, 12, text=f"Vyaapar Mitra — {report_type} Report", align="C")
    pdf.ln(8)
    pdf.set_font("helvetica", "", 10)
    pdf.cell(0, 8, text=f"Total rows: {len(df)}", align="L")
    pdf.ln(10)

    cols = list(df.columns[:5])
    col_w = 35
    pdf.set_font("helvetica", "B", 8)
    for c in cols:
        pdf.cell(col_w, 9, border=1, text=str(c)[:16])
    pdf.ln()

    pdf.set_font("helvetica", "", 8)
    for _, row in df.head(50).iterrows():
        for c in cols:
            val = str(row[c])[:16].encode("latin-1", "replace").decode("latin-1")
            pdf.cell(col_w, 8, border=1, text=val)
        pdf.ln()

    return bytes(pdf.output())
