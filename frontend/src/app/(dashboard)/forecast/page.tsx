"use client";

import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, Package, ArrowUpRight, Loader2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { createClient } from "@/utils/supabase/client";

export default function ForecastPage() {
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

  const forecastData = data?.revenue_forecast?.map((item: any, idx: number) => ({
    month: item.month,
    // First item is actual, others are forecast
    actual: idx === 0 ? item.revenue : null,
    forecast: item.revenue
  })) || [];

  const projectedTotal = data?.revenue_forecast?.reduce((acc: number, curr: any) => acc + curr.revenue, 0) || 0;

  if (!data || forecastData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-card border border-dashed border-border rounded-2xl">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
        <h3 className="text-xl font-bold">No Forecast Available</h3>
        <p className="text-muted-foreground max-w-sm mt-2">We need at least one month of sales data to generate a business forecast for you.</p>
        <button 
          onClick={() => window.location.href = "/upload"}
          className="mt-6 px-6 py-2 bg-primary text-primary-foreground rounded-xl font-bold"
        >
          Upload Data
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Demand Forecast</h2>
          <p className="text-muted-foreground mt-2">AI-predicted sales trends based on your historical data and market patterns.</p>
        </div>
        <button className="hidden sm:flex items-center px-4 py-2 border border-border rounded-lg bg-card hover:bg-muted transition-colors text-sm font-medium">
          <Calendar className="w-4 h-4 mr-2" />
          Next 4 Months
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 bg-card border border-border rounded-xl p-6 shadow-sm"
        >
          <div className="mb-6 flex justify-between items-end">
            <div>
              <h3 className="text-lg font-semibold">Revenue Projection</h3>
              <p className="text-sm text-muted-foreground">Estimated growth based on your data</p>
            </div>
            <div className="flex space-x-4 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-primary mr-2"></div>
                <span>Current</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-secondary border-2 border-dashed border-secondary/50 mr-2"></div>
                <span>Forecast</span>
              </div>
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5A6CFF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#5A6CFF" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7F5AF0" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#7F5AF0" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value.toLocaleString()}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0E0F13', borderColor: '#1f2937', color: '#fff' }} 
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: any) => `₹${value.toLocaleString()}`}
                />
                <Area type="monotone" dataKey="actual" stroke="#5A6CFF" fillOpacity={1} fill="url(#colorActual)" strokeWidth={3} />
                <Area type="monotone" dataKey="forecast" stroke="#7F5AF0" strokeDasharray="5 5" fillOpacity={1} fill="url(#colorForecast)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-xl p-6 shadow-sm"
          >
            <h3 className="text-lg font-semibold mb-4 border-b border-border pb-2">Key Predictions</h3>
            <ul className="space-y-4">
              <li className="flex flex-col">
                <span className="text-muted-foreground text-sm">Growth Sentiment</span>
                <span className="font-semibold text-lg flex items-center">
                  Bullish Trend 
                  <ArrowUpRight className="text-success w-4 h-4 ml-1" />
                </span>
                <span className="text-success text-xs font-medium">+15% projected rise</span>
              </li>
              <li className="flex flex-col pt-2 border-t border-border">
                <span className="text-muted-foreground text-sm">Projected Revenue (4M)</span>
                <span className="font-semibold text-lg">₹{projectedTotal.toLocaleString()}</span>
              </li>
            </ul>
          </motion.div>

          {data?.recommendations && data.recommendations.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-xl p-6 shadow-sm"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-primary">AI Strategy</h3>
                <Package className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm mt-2 text-foreground/80 leading-relaxed">
                {data.recommendations[0].description}
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
