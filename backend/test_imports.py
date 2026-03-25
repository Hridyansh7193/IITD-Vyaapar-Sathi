import sys, os
ORCH_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "orchestration"))
if ORCH_DIR not in sys.path:
    sys.path.insert(0, ORCH_DIR)

print(f"Path: {sys.path}")
try:
    from router import route_csv_processing
    print("Orchestration router imported.")
except Exception as e:
    print(f"Router import failed: {e}")

try:
    import pandas as pd
    df = pd.DataFrame([{"a": 1}])
    # result = route_csv_processing(df, "test-user") # Don't run this yet as it calls Supabase
    print("Pandas OK")
except Exception as e:
    print(f"Pandas failed: {e}")
