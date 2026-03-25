import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get latest dataset for this user
    const dataset = await prisma.dataset.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    if (!dataset || !dataset.analyticsJson) {
      // Return default demo analytics if no dataset uploaded yet
      return NextResponse.json({
        hasData: false,
        revenue_data: [
          { name: "Jan", revenue: 4000 },
          { name: "Feb", revenue: 3000 },
          { name: "Mar", revenue: 5000 },
          { name: "Apr", revenue: 4500 },
          { name: "May", revenue: 6000 },
          { name: "Jun", revenue: 8000 },
          { name: "Jul", revenue: 9500 },
        ],
        category_data: [
          { name: "Electronics", value: 400 },
          { name: "Apparel", value: 300 },
          { name: "Groceries", value: 300 },
          { name: "Furniture", value: 200 },
        ],
        stats: {
          total_revenue: "₹0",
          total_orders: "0",
          net_profit: "₹0",
          avg_order_value: "₹0",
        },
        message: "No data uploaded yet. Upload a CSV to see real analytics.",
      });
    }

    const analyticsRaw = dataset.analyticsJson;
    const analytics = typeof analyticsRaw === 'string' ? JSON.parse(analyticsRaw) : analyticsRaw;
    
    return NextResponse.json({ hasData: true, ...analytics });
  } catch (err) {
    console.error("Analytics fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
