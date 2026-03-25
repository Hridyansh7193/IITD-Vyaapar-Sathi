import pandas as pd
import numpy as np
from profit_engine.analytics import compute_true_profit

def compute_analytics(df: pd.DataFrame) -> dict:
    """
    Compute comprehensive analytics from a CSV DataFrame.
    Accepts flexible column naming - detects common patterns.
    """

    # --- Column Detection ---
    col_map = {}
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")

    # Date column
    for c in ["date", "order_date", "sale_date", "transaction_date"]:
        if c in df.columns:
            col_map["date"] = c
            break

    # Product column
    for c in ["product", "product_name", "item", "item_name", "product_id"]:
        if c in df.columns:
            col_map["product"] = c
            break

    # Category column
    for c in ["category", "product_category", "department", "type"]:
        if c in df.columns:
            col_map["category"] = c
            break

    # Price column
    for c in ["price", "unit_price", "selling_price", "sale_price", "amount"]:
        if c in df.columns:
            col_map["price"] = c
            break

    # Quantity column
    for c in ["quantity", "qty", "units", "units_sold", "quantity_sold"]:
        if c in df.columns:
            col_map["quantity"] = c
            break

    # Revenue column (pre-computed)
    for c in ["revenue", "total", "total_revenue", "sales_amount", "net_amount"]:
        if c in df.columns:
            col_map["revenue"] = c
            break

    # --- Compute Revenue ---
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

    revenue_col = col_map.get("revenue")
    quantity_col = col_map.get("quantity")
    product_col = col_map.get("product")
    category_col = col_map.get("category")
    date_col = col_map.get("date")

    total_revenue = float(df[revenue_col].sum()) if revenue_col else 0.0
    total_orders = len(df)
    total_units = int(df[quantity_col].sum()) if quantity_col else total_orders
    avg_order_value = total_revenue / total_orders if total_orders > 0 else 0.0
    
    # Calculate True Profit (defaults to 18% if no cost_price data exists)
    net_profit = compute_true_profit(df, total_revenue)

    # --- Detailed Trends ---
    category_trend = []
    comparison_data = []
    
    if date_col and revenue_col and category_col:
        try:
            # df["_date"] = pd.to_datetime(df[date_col], errors="coerce", dayfirst=True)
            df["_date"] = pd.to_datetime(df[date_col],format="%Y-%m-%dT%H:%M:%S",errors="coerce")
            df = df.dropna(subset=["_date"])
            
            # 1. Weekly Category Trend
            df["_week"] = df["_date"].dt.to_period("W").apply(lambda r: r.start_time.strftime("Week %U"))
            weekly_cat = df.groupby(["_week", category_col])[revenue_col].sum().unstack(fill_value=0)
            
            for week, row in weekly_cat.tail(4).iterrows():
                entry = {"name": str(week)}
                for cat, val in row.items():
                    entry[str(cat).lower()] = round(float(val), 2)
                category_trend.append(entry)

            # 2. Main Revenue Trend (Total)
            df["_month"] = df["_date"].dt.strftime("%b %Y")
            monthly = df.groupby("_month")[revenue_col].sum()
            df_temp = df[["_date", "_month"]].drop_duplicates("_month").sort_values("_date")
            revenue_trend = [{"name": m, "revenue": round(float(monthly.get(m, 0)), 2)} for m in df_temp["_month"].tolist()]
            
            # 3. Last Year Comparison (Real Data, no simulated fallbacks)
            for m in df_temp["_month"].tail(6).tolist():
                rev_this_year = float(monthly.get(m, 0))
                # Attempt to get last year's month string (e.g., "Jan 2025" -> "Jan 2024")
                try:
                    m_date = pd.to_datetime(m, format="%b %Y")
                    last_year_str = (m_date - pd.DateOffset(years=1)).strftime("%b %Y")
                    rev_last_year = float(monthly.get(last_year_str, 0))
                except:
                    rev_last_year = 0.0

                comparison_data.append({
                    "name": m.split()[0],
                    "thisYear": float(round(float(rev_this_year), 2)),
                    "lastYear": float(round(float(rev_last_year), 2))
                })

            # 4. Simple Demand Forecast (Next 4 Months)
            last_rev = float(monthly.iloc[-1]) if not monthly.empty else 0.0
            last_month_dt = df_temp["_date"].max()
            revenue_forecast = [{"month": str(last_month_dt.strftime("%b %Y")), "revenue": float(round(float(last_rev), 2))}]
            
            for i in range(1, 5):
                next_date = last_month_dt + pd.DateOffset(months=i)
                forecast_rev = last_rev * (1 + 0.05 * i) # Simple 5% growth projection
                revenue_forecast.append({
                    "month": str(next_date.strftime("%b %Y")),
                    "revenue": float(round(float(forecast_rev), 2))
                })
        except Exception as e:
            print(f"Trend compute error: {str(e)}")
            pass

    if not revenue_trend and revenue_col:
        revenue_trend = [{"name": "All Time", "revenue": float(round(float(total_revenue), 2))}]
    
    revenue_forecast = revenue_forecast if 'revenue_forecast' in locals() else []


    # --- Top Products ---
    top_products = []
    slow_products = []
    if product_col and revenue_col:
        prod_rev = df.groupby(product_col)[revenue_col].sum()
        prod_qty = df.groupby(product_col)[quantity_col].sum() if quantity_col else pd.Series(dtype=float)

        sorted_prod = prod_rev.sort_values(ascending=False)
        for prod, rev in sorted_prod.head(10).items():
            units = int(prod_qty.get(prod, 0)) if not prod_qty.empty else 0
            top_products.append({
                "product": str(prod),
                "revenue": f"₹{rev:,.0f}",
                "revenue_raw": round(float(rev), 2),
                "units": units,
            })
        for prod, rev in sorted_prod.tail(5).items():
            units = int(prod_qty.get(prod, 0)) if not prod_qty.empty else 0
            slow_products.append({
                "product": str(prod),
                "revenue": f"₹{rev:,.0f}",
                "revenue_raw": round(float(rev), 2),
                "units": units,
            })

    # --- Category Breakdown ---
    category_data = []
    if category_col and revenue_col:
        cat_rev = df.groupby(category_col)[revenue_col].sum().sort_values(ascending=False)
        for cat, rev in cat_rev.items():
            pct = (rev / total_revenue * 100) if total_revenue > 0 else 0
            category_data.append({
                "name": str(cat),
                "value": round(float(rev), 2),
                "percentage": f"{pct:.1f}%",
            })

    # --- GST Estimate (India) ---
    gst_rates = {"Electronics": 18, "Apparel": 12, "Groceries": 5, "Furniture": 18, "Medicines": 12}
    total_gst = 0.0
    gst_categories = []
    if category_col and revenue_col:
        cat_rev_dict = df.groupby(category_col)[revenue_col].sum().to_dict()
        for cat, rev in cat_rev_dict.items():
            rate = gst_rates.get(str(cat), 18)
            gst_amount = float(rev) * rate / 100
            total_gst += gst_amount
            gst_categories.append({
                "category": str(cat),
                "rate": f"{rate}%",
                "sales": round(float(rev), 2),
                "tax": round(gst_amount, 2),
            })
    else:
        total_gst = total_revenue * 0.18
        gst_categories = [{"category": "All Products", "rate": "18%", "sales": round(total_revenue, 2), "tax": round(total_gst, 2)}]

    cgst = total_gst / 2
    sgst = total_gst / 2

    # --- AI-style Recommendations (rule-based) ---
    recommendations = []
    if top_products:
        recommendations.append({
            "type": "positive",
            "title": "Top Performing Product",
            "description": f'"{top_products[0]["product"]}" is your best seller with {top_products[0]["revenue"]} revenue. Stock up to meet demand.',
            "action": f'Increase inventory for "{top_products[0]["product"]}"',
        })
    if slow_products:
        recommendations.append({
            "type": "warning",
            "title": "Slow-Moving Inventory Alert",
            "description": f'"{slow_products[0]["product"]}" has the lowest sales with only {slow_products[0]["units"]} units moved.',
            "action": "Run a 15-20% clearance campaign for this product",
        })
    if category_data and len(category_data) > 1:
        top_cat = category_data[0]["name"]
        recommendations.append({
            "type": "positive",
            "title": "Dominant Category",
            "description": f'"{top_cat}" drives {category_data[0]["percentage"]} of your revenue. This is your core strength.',
            "action": f"Expand your product range in {top_cat}",
        })
    recommendations.append({
        "type": "neutral",
        "title": "Profitability Insight",
        "description": f"Your calculated net profit is ₹{net_profit:,.0f}. For older records, an 18% margin is assumed.",
        "action": "Consider reviewing supplier rates to increase margins",
    })

    # --- Dynamic Month-Over-Month Changes ---
    rev_change = "+0%"
    ord_change = "+0%"
    prof_change = "+0%"
    avg_change = "+0%"
    
    if len(comparison_data) >= 2:
        last = comparison_data[-1]["thisYear"]
        prev = comparison_data[-2]["thisYear"]
        if prev > 0:
            diff_pct = ((last - prev) / prev) * 100
            rev_change = f"{'+' if diff_pct >= 0 else ''}{diff_pct:.1f}%"
            ord_change = rev_change # Estimated using revenue trend
            prof_change = rev_change
            avg_change = rev_change

    return {
        "stats": {
            "total_revenue": f"₹{total_revenue:,.0f}",
            "total_revenue_raw": round(total_revenue, 2),
            "revenue_change": rev_change,
            "total_orders": f"{total_orders:,}",
            "total_orders_raw": total_orders,
            "orders_change": ord_change,
            "net_profit": f"₹{net_profit:,.0f}",
            "net_profit_raw": round(net_profit, 2),
            "profit_change": prof_change,
            "avg_order_value": f"₹{avg_order_value:,.0f}",
            "avg_order_raw": round(avg_order_value, 2),
            "avg_change": avg_change,
            "total_units": total_units,
        },
        "revenue_data": revenue_trend,
        "revenue_forecast": revenue_forecast,
        "category_data": category_data,
        "category_trend": category_trend,
        "comparison_data": comparison_data,
        "top_products": top_products,
        "slow_products": slow_products,
        "gst_estimate": {
            "total_gst": round(total_gst, 2),
            "cgst": round(cgst, 2),
            "sgst": round(sgst, 2),
            "categories": gst_categories,
            "breakdown": [
                {"name": "CGST", "value": round(cgst, 2)},
                {"name": "SGST", "value": round(sgst, 2)},
            ],
        },
        "recommendations": recommendations,
        "columns_detected": list(col_map.keys()),
    }

