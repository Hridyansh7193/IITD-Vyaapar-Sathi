import pandas as pd

def compute_true_profit(df: pd.DataFrame, total_revenue: float) -> float:
    """
    Calculates true profit. 
    If a record has 'true_profit', it sums it up. 
    Otherwise, it estimates 18% of the revenue for older records logically.
    """
    col_map = {}
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_").str.replace(".", "")
    
    # Check for direct 'true_profit'
    true_profit_col = None
    for c in ["true_profit", "net_profit", "profit"]:
        if c in df.columns:
            true_profit_col = c
            break

    # If the column inherently exists due to our v2 checkout logging it
    if true_profit_col:
        # We split the dataframe: records with true_profit and records without
        has_profit_mask = df[true_profit_col].notna() & (df[true_profit_col] != 0)
        
        # Sum known profit
        known_profit = float(df.loc[has_profit_mask, true_profit_col].sum())
        
        # Estimate profit for legacy columns
        # First find revenue col like analytics.py does
        rev_col = None
        for c in ["revenue", "total", "total_revenue", "sales_amount", "_revenue"]:
            if c in df.columns:
                rev_col = c
                break

        if rev_col:
             # Calculate legacy revenue
             legacy_revenue = float(df.loc[~has_profit_mask, rev_col].sum())
             estimated_legacy_profit = legacy_revenue * 0.18
        else:
             # fallback globally logic
             percentage_legacy = (~has_profit_mask).sum() / len(df) if len(df) > 0 else 0
             estimated_legacy_profit = (total_revenue * percentage_legacy) * 0.18

        return known_profit + estimated_legacy_profit
    
    # If the column doesn't exist at all (entirely legacy data)
    return total_revenue * 0.18

