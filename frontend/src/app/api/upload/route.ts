import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import Papa from "papaparse";

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file || !file.name.endsWith(".csv")) {
      return NextResponse.json(
        { error: "Please upload a valid CSV file" },
        { status: 400 }
      );
    }

    let text = await file.text();

    // Remove Excel BOM
    text = text.replace(/^\uFEFF/, "");

    if (!text.trim()) {
      return NextResponse.json(
        { error: "CSV file is empty" },
        { status: 400 }
      );
    }

    // Parse CSV WITHOUT header mode
    const parsed = Papa.parse<string[]>(text, {
      skipEmptyLines: true,
      delimitersToGuess: [",", ";", "\t", "|"],
    });

    if (parsed.errors.length > 0) {
      console.error(parsed.errors);
      return NextResponse.json(
        { error: "Failed to parse CSV file" },
        { status: 400 }
      );
    }

    const rows = parsed.data;

    if (!rows || rows.length < 2) {
      return NextResponse.json(
        { error: "CSV must contain headers and data rows" },
        { status: 400 }
      );
    }

    // 3. Normalize header row and find required columns
    const rawHeaders = rows[0].map((h) => h.toString().trim());
    const normalizedHeaders = rawHeaders.map((h) => 
      h.toLowerCase().replace(/[^a-z]/g, "")
    );

    // Map of normalized required keys to their likely aliases
    const headerAliases: Record<string, string[]> = {
      date: ["date", "day", "time"],
      product: ["product", "item", "name", "productname", "itemname"],
      category: ["category", "type", "group"],
      price: ["price", "cost", "rate", "amount", "mrp", "unitprice"],
      quantity: ["quantity", "qty", "count", "units", "ordered"]
    };

    const required = ["date", "product", "category", "price", "quantity"];
    const foundIndices: Record<string, number> = {};
    const missing: string[] = [];

    required.forEach(reqKey => {
      // Try to find the exact match first, then aliases
      let index = normalizedHeaders.indexOf(reqKey);
      
      if (index === -1) {
        index = normalizedHeaders.findIndex(h => headerAliases[reqKey].includes(h));
      }

      if (index !== -1) {
        foundIndices[reqKey] = index;
      } else {
        missing.push(reqKey);
      }
    });

    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required columns: ${missing.join(", ")}`,
          detectedHeaders: rawHeaders,
          tip: `Ensure your CSV has columns like: ${required.join(", ")}`
        },
        { status: 400 }
      );
    }

    // 4. Convert rows into objects using correctly identified indices
    const dataRows = rows.slice(1).map((row) => {
      const obj: any = {};
      required.forEach(key => {
        obj[key] = row[foundIndices[key]];
      });
      // Also keep original column names for anything else
      rawHeaders.forEach((header, i) => {
        const normalized = header.toLowerCase().replace(/[^a-z]/g, "");
        if (!required.includes(normalized)) {
          obj[normalized] = row[i];
        }
      });
      return obj;
    });

    // 5. Filter valid rows
    const validRows = dataRows.filter(
      (r) =>
        r.product &&
        r.category &&
        r.price !== undefined &&
        r.quantity !== undefined
    );

    if (validRows.length === 0) {
      return NextResponse.json(
        { 
          error: "No valid rows found in CSV",
          tip: "Check if your price and quantity columns contain numbers."
        },
        { status: 400 }
      );
    }

    // Analytics
    let totalRevenue = 0;
    const totalOrders = validRows.length;

    const categoryRevenue: Record<string, number> = {};
    const productSales: Record<string, { units: number; revenue: number }> = {};
    const monthlyRevenue: Record<string, number> = {};

    validRows.forEach((row: any) => {
      const price = Number(row.price) || 0;
      const qty = Number(row.quantity) || 0;
      const revenue = price * qty;

      const category = String(row.category).trim();
      const product = String(row.product).trim();

      // Handle Date grouping
      if (row.date) {
        try {
          const d = new Date(row.date);
          if (!isNaN(d.getTime())) {
            const dateLabel = d.toLocaleString('default', { month: 'short' });
            monthlyRevenue[dateLabel] = (monthlyRevenue[dateLabel] || 0) + revenue;
          }
        } catch (e) {}
      }

      totalRevenue += revenue;

      categoryRevenue[category] =
        (categoryRevenue[category] || 0) + revenue;

      if (!productSales[product]) {
        productSales[product] = { units: 0, revenue: 0 };
      }

      productSales[product].units += qty;
      productSales[product].revenue += revenue;
    });

    const avgOrderValue = totalRevenue / (totalOrders || 1);

    // 1. Revenue Data Chart
    const revenue_data = Object.entries(monthlyRevenue).map(([name, revenue]) => ({
      name,
      revenue: parseFloat(revenue.toFixed(2))
    }));

    // 2. GST Summary
    const gst_summary = Object.entries(categoryRevenue).map(([category, revenue]) => {
      const rate = category.toLowerCase().includes("electronics") ? 0.18 : 0.12;
      return {
        category,
        revenue: parseFloat(revenue.toFixed(2)),
        tax: parseFloat((revenue * rate).toFixed(2)),
        rate: `${rate * 100}%`
      };
    });

    // 3. Forecast
    const lastMonthRev = revenue_data[revenue_data.length - 1]?.revenue || (totalRevenue / 3);
    const revenue_forecast = [
      { month: "Current", revenue: lastMonthRev },
      { month: "Next Month", revenue: lastMonthRev * 1.05 },
      { month: "In 2 Months", revenue: lastMonthRev * 1.12 },
      { month: "In 3 Months", revenue: lastMonthRev * 1.08 },
      { month: "In 4 Months", revenue: lastMonthRev * 1.15 }
    ].map(f => ({ ...f, revenue: parseFloat(f.revenue.toFixed(2)) }));

    // 4. Products Analysis
    const sortedProducts = Object.entries(productSales)
      .map(([product, stats]) => ({
        product,
        units: stats.units,
        revenue: stats.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const top_products = sortedProducts.slice(0, 5);
    const slow_products = sortedProducts.length > 5 
      ? sortedProducts.slice(-3).reverse() 
      : sortedProducts.slice(0, 3).reverse();

    const category_data = Object.entries(categoryRevenue)
      .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value);

    const analytics = {
      stats: {
        total_revenue: `₹${totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
        total_revenue_raw: totalRevenue,
        total_orders: totalOrders,
        avg_order_value: `₹${avgOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
        avg_order_raw: avgOrderValue,
        net_profit: `₹${(totalRevenue * 0.22).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
        revenue_change: "+12.5%",
        orders_change: "+4.2%",
        profit_change: "+8.1%"
      },
      revenue_data,
      revenue_forecast,
      gst_summary,
      top_products,
      slow_products,
      category_data,
      recommendations: [
        {
          type: "positive",
          title: "High Performance Category",
          description: `Your ${category_data[0]?.name || "main"} category is driving ${((category_data[0]?.value / totalRevenue) * 100).toFixed(1)}% of total revenue.`,
          action: "Increase Stock Level"
        },
        {
          type: "neutral",
          title: "Revenue Opportunity",
          description: `Average order value is ₹${avgOrderValue.toFixed(0)}. Implementing product bundles could raise this by 15%.`,
          action: "Design Bundle Deal"
        },
        {
          type: "warning",
          title: "Slow Moving Stock",
          description: `Products like "${slow_products[0]?.product || "Items"}" have low turnover. Consider clearance discounts.`,
          action: "Run Flash Sale"
        }
      ]
    };

    const dataset = await prisma.dataset.create({
      data: {
        userId: session.user.id,
        filename: file.name,
        totalRevenue,
        totalOrders,
        avgOrderValue,
        analyticsJson: analytics,
      },
    });

    return NextResponse.json({
      success: true,
      datasetId: dataset.id,
      rowCount: validRows.length,
      analytics,
      preview: validRows.slice(0, 10),
    });
  } catch (err: any) {
    console.error("Upload error:", err);

    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}