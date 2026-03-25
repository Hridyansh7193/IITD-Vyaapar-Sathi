"use client";
import { getApiUrl } from "@/lib/utils";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Package, Star, Loader2, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { createClient } from "@/utils/supabase/client";

export default function PerformancePage() {
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

  if (isLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const performanceData = data?.category_data || [];
  const topProducts = data?.top_products || [];
  const starPerformer = topProducts.length > 0 ? topProducts[0] : null;

  return (
    <div className="space-y-6 mb-12">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">Product Performance</h2>
        <p className="text-muted-foreground mt-2">Analyze sales, profitability, and trends for your product catalog.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 bg-card border border-border rounded-xl p-6 shadow-sm"
        >
          <div className="mb-6">
            <h3 className="text-lg font-semibold">Category Sales Breakdown</h3>
            <p className="text-sm text-muted-foreground">Revenue contribution by category</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0E0F13', borderColor: '#1f2937', color: '#fff' }} 
                  cursor={{ fill: '#1f2937', opacity: 0.4 }}
                />
                <Bar dataKey="value" name="Revenue" fill="#5A6CFF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col"
        >
          <div className="mb-6 flex items-center text-primary">
            <Star className="w-5 h-5 mr-2" fill="currentColor" />
            <h3 className="text-lg font-semibold text-foreground">Top Performer</h3>
          </div>
          {starPerformer ? (
            <div className="flex-1 flex flex-col justify-center items-center text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Package className="w-10 h-10 text-primary" />
              </div>
              <h4 className="font-bold text-xl mb-1 text-foreground leading-tight">{starPerformer.product}</h4>
              <p className="text-muted-foreground text-sm mb-4">Bestselling Item</p>
              <div className="w-full grid grid-cols-2 gap-4 mt-auto">
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Units Sold</p>
                  <p className="font-semibold text-lg">{starPerformer.units}</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="font-semibold text-lg">{starPerformer.revenue}</p>
                </div>
              </div>
            </div>
          ) : (
             <div className="flex-1 flex items-center justify-center text-center opacity-30 italic text-sm">
                Upload data to identify performers
             </div>
          )}
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card border border-border rounded-xl shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold">Top Products</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
              <tr>
                <th scope="col" className="px-6 py-4">Product Name</th>
                <th scope="col" className="px-6 py-4">Units Sold</th>
                <th scope="col" className="px-6 py-4">Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.length > 0 ? (
                topProducts.map((product: any, idx: number) => (
                  <tr key={idx} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{product.product}</td>
                    <td className="px-6 py-4 font-medium">{product.units}</td>
                    <td className="px-6 py-4 font-semibold">{product.revenue}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground italic">
                    No product data available. Upload a CSV to see performance.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
