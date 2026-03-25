"use client";
import { getApiUrl } from "@/lib/utils";

import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Loader2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { createClient } from "@/utils/supabase/client";

export default function AnalyticsPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const { data, isLoading } = useSWR(
    userId ? `${getApiUrl()}/analytics?user_id=${userId}` : null,
    fetcher
  );

  const salesTrendData = data?.category_trend || [];
  const monthlyCompare = data?.comparison_data || [];
  const stats = data?.stats || {};

  // Extract categories for Line lines
  const categories = data?.category_data?.map((c: any) => c.name.toLowerCase()) || [];
  const colors = ["#5A6CFF", "#7F5AF0", "#2ECC71", "#F1C40F", "#E67E22"];

  if (isLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!data || salesTrendData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-card border border-dashed border-border rounded-2xl">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
        <h3 className="text-xl font-bold">No Analytics Data</h3>
        <p className="text-muted-foreground max-w-sm mt-2">Upload a sales CSV in the Data Integration section to see your business intelligence dashboard.</p>
        <button 
          onClick={() => window.location.href = "/upload"}
          className="mt-6 px-6 py-2 bg-primary text-primary-foreground rounded-xl font-bold"
        >
          Go to Upload
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-8 mb-12">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">Sales Analytics</h2>
        <p className="text-muted-foreground mt-2">Detailed breakdown of your sales performance across categories and time periods.</p>
      </div>

      {/* Year-over-Year Comparison */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-6 shadow-sm"
      >
        <div className="mb-6">
          <h3 className="text-lg font-semibold">Year-over-Year Revenue</h3>
          <p className="text-sm text-muted-foreground">2025 vs 2026 revenue comparison</p>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyCompare}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0E0F13', borderColor: '#1f2937' }} 
                itemStyle={{ color: '#fff' }}
                cursor={{ fill: '#1f2937', opacity: 0.4 }}
              />
              <Legend wrapperStyle={{ color: '#9ca3af', fontSize: '12px' }} />
              <Bar dataKey="thisYear" name="2026" fill="#5A6CFF" radius={[4, 4, 0, 0]} />
              <Bar dataKey="lastYear" name="2025" fill="#7F5AF0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
      
      {/* Category Sales Trend */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-card border border-border rounded-xl p-6 shadow-sm"
      >
        <div className="mb-6">
          <h3 className="text-lg font-semibold">Category Sales Trend (This Month)</h3>
          <p className="text-sm text-muted-foreground">Weekly comparison of top product categories</p>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#0E0F13', borderColor: '#1f2937' }} itemStyle={{ color: '#fff' }} />
              <Legend wrapperStyle={{ color: '#9ca3af', fontSize: '12px' }} />
              {categories.map((cat: string, idx: number) => (
                <Line 
                  key={cat}
                  type="monotone" 
                  dataKey={cat} 
                  name={cat.charAt(0).toUpperCase() + cat.slice(1)} 
                  stroke={colors[idx % colors.length]} 
                  strokeWidth={3} 
                  dot={false} 
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Top Performers — Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: stats.total_revenue || "₹0", sub: "All time recorded", up: true },
          { label: "Avg Transaction", value: stats.avg_order_value || "₹0", sub: "Growth assumed", up: true },
          { label: "Total Orders", value: stats.total_orders || "0", sub: "Processed successfully", up: true },
          { label: "Inventory Scaled", value: stats.total_units || "0", sub: "Units moved", up: true },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
            className="bg-card border border-border rounded-xl p-5"
          >
            <p className="text-sm text-muted-foreground mb-1">{item.label}</p>
            <p className="text-xl font-bold">{item.value}</p>
            <p className={`text-xs mt-1 font-medium ${item.up ? 'text-success' : 'text-red-400'} flex items-center gap-1`}>
              {item.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{item.sub}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
