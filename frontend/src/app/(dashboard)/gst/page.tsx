"use client";

import { motion } from "framer-motion";
import { Receipt, Download, FileText, AlertCircle, Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { useState, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { createClient } from "@/utils/supabase/client";

const COLORS = ['#5A6CFF', '#7F5AF0', '#F59E0B', '#10B981'];

export default function GSTSummaryPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const { data, isLoading } = useSWR(
    userId ? `http://localhost:8000/analytics?user_id=${userId}` : null,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const gstSummary = data?.gst_estimate?.categories || [];
  const totalTax = data?.gst_estimate?.total_gst || 0;
  
  const pieData = gstSummary.map((item: any) => ({
    name: item.category,
    value: item.tax
  }));

  return (
    <div className="space-y-6 mb-12">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">GST Summary</h2>
          <p className="text-muted-foreground mt-2">Automated tax calculations based on your uploaded sales datasets.</p>
        </div>
        <button className="mt-4 sm:mt-0 flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors w-fit shadow-lg shadow-primary/20">
          <Download className="w-4 h-4 mr-2" />
          Export GSTR-3B Draft
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-center"
        >
          <div className="flex items-center space-x-3 text-muted-foreground mb-4">
            <Receipt className="w-5 h-5" />
            <h3 className="font-medium">Total Tax Liability</h3>
          </div>
          <div className="text-4xl font-bold font-mono">₹{totalTax.toLocaleString()}</div>
          <p className="text-sm text-muted-foreground mt-2">Estimated from processed data</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-2 bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between"
        >
          <div className="w-full sm:w-1/2">
            <h3 className="font-semibold text-lg mb-1">Tax by Category</h3>
            <p className="text-sm text-muted-foreground mb-4">Distribution of GST liability</p>
            <div className="space-y-3">
              {gstSummary.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-muted-foreground">{item.category}</span>
                  </div>
                  <span className="font-medium font-mono">₹{item.tax.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="w-full sm:w-1/2 h-[200px] mt-6 sm:mt-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0E0F13', borderColor: '#1f2937' }} 
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: any) => `₹${Number(value).toLocaleString()}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card border border-border rounded-xl shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h3 className="text-lg font-semibold">Detailed GST Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
              <tr>
                <th scope="col" className="px-6 py-4">Category</th>
                <th scope="col" className="px-6 py-4">Est. Rate</th>
                <th scope="col" className="px-6 py-4">Taxable Sales</th>
                <th scope="col" className="px-6 py-4">GST Amount</th>
              </tr>
            </thead>
            <tbody>
              {gstSummary.length > 0 ? (
                gstSummary.map((cat: any, i: number) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-medium">{cat.category}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium text-xs">
                        {cat.rate}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-muted-foreground">₹{cat.sales.toLocaleString()}</td>
                    <td className="px-6 py-4 font-semibold font-mono">₹{cat.tax.toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic">
                    No GST data available. Upload data to calculate tax estimates.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start"
      >
        <AlertCircle className="w-5 h-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-medium text-yellow-600 dark:text-yellow-500">Legal Disclaimer</h4>
          <p className="text-sm text-yellow-600/80 dark:text-yellow-500/80 mt-1">
            These summaries are calculated based on your sales datasets and standard Indian GST rates. Please consult an authorized tax professional before filing actual GSTR reports.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
