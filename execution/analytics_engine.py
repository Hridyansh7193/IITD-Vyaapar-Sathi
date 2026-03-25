"""
execution/analytics_engine.py
==============================
Pure analytics computation — no web framework dependency.
Accepts a pandas DataFrame and returns a structured analytics dict.

This is the single source of truth for all analytics logic.
Both the FastAPI backend and any future CLI tools use this module.
"""

import pandas as pd
import numpy as np
from typing import Optional


def compute_analytics(df: pd.DataFrame) -> dict:
    """
    Compute comprehensive analytics from a sales CSV DataFrame.
    Auto-detects common column naming patterns (flexible schema).

    Args:
        df: Pandas DataFrame (already parsed, un-cleaned is fine).

    Returns:
        dict: Structured analytics including stats, trends, products, GST, recommendations.
    """

    # ── 1. Column Detection ────────────────────────────────────────────────────
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")
    col_map = {}

    PATTERNS = {
        "date":     ["date", "order_date", "sale_date", "transaction_date"],
        "product":  ["product", "product_name", "item", "item_name", "product_id"],
        "category": ["category", "product_category", "department", "type"],
        "price":    ["price", "unit_price", "selling_price", "sale_price", "amount"],
        "quantity": ["quantity", "qty", "units", "units_sold", "quantity_sold"],
        "revenue":  ["revenue", "total", "total_revenue", "sales_amount", "net_amount"],
    }

    for key, candidates in PATTERNS.items():
        for c in candidates:
            if c in df.columns:
                col_map[key] = c
                break

    # ── 2. Revenue Derivation ──────────────────────────────────────────────────
    if "revenue" not in col_map:
        if "price" in col_map and "quantity" in col_map:
            df["_revenue"] = (
                pd.to_numeric(df[col_map["price"]], errors="coerce").fillna(0) *
                pd.to_numeric(df[col_map["quantity"]], errors="coerce").fillna(0)
            )
            col_map["revenue"] = "_revenue"
        elif "price" in col_map:
            df["_revenue"] = pd.to_numeric(df[col_map["price"]], errors="coerce").fillna(0)
            col_map["revenue"] = "_revenue"

    rc = col_map.get("revenue")
    qc = col_map.get("quantity")
    pc = col_map.get("product")
    cc = col_map.get("category")
    dc = col_map.get("date")

    # ── 3. KPI Stats ───────────────────────────────────────────────────────────
    total_revenue = float(df[rc].sum()) if rc else 0.0
    total_orders  = len(df)
    total_units   = int(df[qc].sum()) if qc else total_orders
    avg_order     = total_revenue / total_orders if total_orders > 0 else 0.0
    net_profit    = total_revenue * 0.18  # estimated 18% margin

    # ── 4. Time-Series Trends ──────────────────────────────────────────────────
    revenue_trend:    list = []
    revenue_forecast: list = []
    comparison_data:  list = []
    category_trend:   list = []
    rev_change = ord_change = prof_change = avg_change = "+0%"

    if dc and rc:
        try:
            df["_date"] = pd.to_datetime(df[dc], errors="coerce", dayfirst=True)
            df = df.dropna(subset=["_date"])

            df["_month"] = df["_date"].dt.strftime("%b %Y")
            monthly = df.groupby("_month")[rc].sum()
            df_temp = df[["_date", "_month"]].drop_duplicates("_month").sort_values("_date")

            revenue_trend = [
                {"name": m, "revenue": round(float(monthly.get(m, 0)), 2)}
                for m in df_temp["_month"].tolist()
            ]

            # Year-over-year comparison (last 6 months)
            for m in df_temp["_month"].tail(6).tolist():
                this = float(monthly.get(m, 0))
                try:
                    m_date = pd.to_datetime(m, format="%b %Y")
                    last_yr_str = (m_date - pd.DateOffset(years=1)).strftime("%b %Y")
                    last = float(monthly.get(last_yr_str, 0))
                except Exception:
                    last = 0.0
                comparison_data.append({
                    "name": m.split()[0],
                    "thisYear": round(this, 2),
                    "lastYear": round(last, 2),
                })

            # Simple 5% growth forecast (next 4 months)
            last_rev = float(monthly.iloc[-1]) if not monthly.empty else 0.0
            last_dt  = df_temp["_date"].max()
            revenue_forecast = [
                {"month": str(last_dt.strftime("%b %Y")), "revenue": round(last_rev, 2)}
            ]
            for i in range(1, 5):
                nd = last_dt + pd.DateOffset(months=i)
                revenue_forecast.append({
                    "month": nd.strftime("%b %Y"),
                    "revenue": round(last_rev * (1 + 0.05 * i), 2),
                })

            # Weekly category trend
            if cc:
                df["_week"] = df["_date"].dt.to_period("W").apply(
                    lambda r: r.start_time.strftime("Week %U")
                )
                weekly_cat = df.groupby(["_week", cc])[rc].sum().unstack(fill_value=0)
                for week, row in weekly_cat.tail(4).iterrows():
                    entry = {"name": str(week)}
                    for cat, val in row.items():
                        entry[str(cat).lower()] = round(float(val), 2)
                    category_trend.append(entry)

            # Month-over-month change
            if len(comparison_data) >= 2:
                last_v = comparison_data[-1]["thisYear"]
                prev_v = comparison_data[-2]["thisYear"]
                if prev_v > 0:
                    pct = ((last_v - prev_v) / prev_v) * 100
                    rev_change = ord_change = prof_change = avg_change = (
                        f"{'+' if pct >= 0 else ''}{pct:.1f}%"
                    )
        except Exception as e:
            print(f"[analytics_engine] Trend error: {e}")

    if not revenue_trend and rc:
        revenue_trend = [{"name": "All Time", "revenue": round(total_revenue, 2)}]

    # ── 5. Top & Slow Products ────────────────────────────────────────────────
    top_products:  list = []
    slow_products: list = []

    if pc and rc:
        prod_rev = df.groupby(pc)[rc].sum()
        prod_qty = df.groupby(pc)[qc].sum() if qc else pd.Series(dtype=float)
        sorted_p = prod_rev.sort_values(ascending=False)

        for prod, rev in sorted_p.head(10).items():
            units = int(prod_qty.get(prod, 0)) if not prod_qty.empty else 0
            top_products.append({
                "product": str(prod),
                "revenue": f"₹{rev:,.0f}",
                "revenue_raw": round(float(rev), 2),
                "units": units,
            })

        for prod, rev in sorted_p.tail(5).items():
            units = int(prod_qty.get(prod, 0)) if not prod_qty.empty else 0
            slow_products.append({
                "product": str(prod),
                "revenue": f"₹{rev:,.0f}",
                "revenue_raw": round(float(rev), 2),
                "units": units,
            })

    # ── 6. Category Breakdown ─────────────────────────────────────────────────
    category_data: list = []
    if cc and rc:
        cat_rev = df.groupby(cc)[rc].sum().sort_values(ascending=False)
        for cat, rev in cat_rev.items():
            pct = (rev / total_revenue * 100) if total_revenue > 0 else 0
            category_data.append({
                "name": str(cat),
                "value": round(float(rev), 2),
                "percentage": f"{pct:.1f}%",
            })

    # ── 7. GST Estimate ───────────────────────────────────────────────────────
    GST_RATES = {"Electronics": 18, "Apparel": 12, "Groceries": 5,
                 "Furniture": 18, "Medicines": 12, "Food": 5}
    total_gst, gst_categories = 0.0, []

    if cc and rc:
        for cat, rev in df.groupby(cc)[rc].sum().items():
            rate = GST_RATES.get(str(cat), 18)
            gst  = float(rev) * rate / 100
            total_gst += gst
            gst_categories.append({
                "category": str(cat), "rate": f"{rate}%",
                "sales": round(float(rev), 2), "tax": round(gst, 2),
            })
    else:
        total_gst = total_revenue * 0.18
        gst_categories = [{"category": "All Products", "rate": "18%",
                            "sales": round(total_revenue, 2), "tax": round(total_gst, 2)}]

    cgst = sgst = total_gst / 2

    # ── 8. AI Recommendations (Rule-based) ────────────────────────────────────
    recommendations: list = []
    if top_products:
        recommendations.append({
            "type": "positive",
            "title": "Top Performing Product",
            "description": (
                f'"{top_products[0]["product"]}" is your best seller with '
                f'{top_products[0]["revenue"]} revenue. Stock up!'
            ),
            "action": f'Increase inventory for "{top_products[0]["product"]}"',
        })
    if slow_products:
        recommendations.append({
            "type": "warning",
            "title": "Slow-Moving Inventory Alert",
            "description": (
                f'"{slow_products[0]["product"]}" has the lowest sales with '
                f'only {slow_products[0]["units"]} units sold.'
            ),
            "action": "Consider a 15-20% clearance discount",
        })
    if category_data and len(category_data) > 1:
        recommendations.append({
            "type": "positive",
            "title": "Dominant Category",
            "description": (
                f'"{category_data[0]["name"]}" drives {category_data[0]["percentage"]} '
                f'of your revenue.'
            ),
            "action": f'Expand your range in {category_data[0]["name"]}',
        })
    recommendations.append({
        "type": "neutral",
        "title": "Profitability Insight",
        "description": f"Estimated net profit: ₹{net_profit:,.0f} (18% margin assumption).",
        "action": "Review supplier rates to improve margins",
    })

    # ── 9. Final Response ──────────────────────────────────────────────────────
    return {
        "stats": {
            "total_revenue":     f"₹{total_revenue:,.0f}",
            "total_revenue_raw": round(total_revenue, 2),
            "revenue_change":    rev_change,
            "total_orders":      f"{total_orders:,}",
            "total_orders_raw":  total_orders,
            "orders_change":     ord_change,
            "net_profit":        f"₹{net_profit:,.0f}",
            "net_profit_raw":    round(net_profit, 2),
            "profit_change":     prof_change,
            "avg_order_value":   f"₹{avg_order:,.0f}",
            "avg_order_raw":     round(avg_order, 2),
            "avg_change":        avg_change,
            "total_units":       total_units,
        },
        "revenue_data":     revenue_trend,
        "revenue_forecast":  revenue_forecast,
        "category_data":    category_data,
        "category_trend":   category_trend,
        "comparison_data":  comparison_data,
        "top_products":     top_products,
        "slow_products":    slow_products,
        "gst_estimate": {
            "total_gst":  round(total_gst, 2),
            "cgst":       round(cgst, 2),
            "sgst":       round(sgst, 2),
            "categories": gst_categories,
            "breakdown": [
                {"name": "CGST", "value": round(cgst, 2)},
                {"name": "SGST", "value": round(sgst, 2)},
            ],
        },
        "recommendations":    recommendations,
        "columns_detected":   list(col_map.keys()),
    }
