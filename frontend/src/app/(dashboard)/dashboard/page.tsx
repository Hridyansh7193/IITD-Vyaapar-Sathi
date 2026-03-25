"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowUpRight, 
  DollarSign, 
  Package, 
  ShoppingCart, 
  Activity, 
  Lightbulb, 
  AlertCircle, 
  Loader2, 
  Send, 
  Bot, 
  User, 
  MessageSquare,
  Sparkles,
  TrendingUp,
  LayoutDashboard,
  Zap,
  ChevronRight
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { cn } from "@/lib/utils";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { toast } from "sonner";

import { createClient } from "@/utils/supabase/client";

export default function DashboardPage() {
  const [range, setRange] = useState("month");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const { data, error, isLoading } = useSWR(
    userId ? `http://localhost:8000/analytics?user_id=${userId}&range=${range}` : null,
    fetcher
  );
  // Chatbot state
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<any[]>([
    { role: "assistant", content: "Hello! I am your AI Business Desk. Upload your sales data and ask me to analyze revenue trends or top products." }
  ]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const userQuery = input.trim();
    setInput("");
    setIsSending(true);

    try {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: userQuery }
      ]);

      const res = await fetch("http://localhost:8000/chat-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userQuery,
          user_id: userId || "anonymous",
        }),
      });
      
      if (!res.ok) throw new Error("Failed to send message");
      
      const resData = await res.json();
      const assistantContent = resData.response || "No response generated.";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: assistantContent }
      ]);
    } catch (err) {
      toast.error("AI Assistant is having trouble. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  const revenueData = data?.revenue_data ?? [];
  const categoryData = data?.category_data ?? [];
  const statsData = data?.stats ?? {};
  // Expanded color palette so categories don't repeat the same colors
  const COLORS = ['#c3c0ff', '#4f46e5', '#4edea3', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#a855f7'];

  const stats = [
    { title: "Revenue", value: statsData.total_revenue || "₹0", change: statsData.revenue_change || "+12%", icon: DollarSign, trend: "up" },
    { title: "Orders", value: statsData.total_orders || "0", change: statsData.orders_change || "+5%", icon: ShoppingCart, trend: "up" },
    { title: "Net Profit", value: statsData.net_profit || "₹0", change: statsData.profit_change || "+18%", icon: Activity, trend: "up" },
    { title: "AOV", value: statsData.avg_order_value || "₹0", change: statsData.avg_change || "-2%", icon: Package, trend: "down" },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Intelligence Dashboard</h2>
          <p className="text-muted-foreground text-sm font-medium">Real-time business trends and AI-driven growth analytics.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-muted p-1 rounded-xl shadow-inner">
             {["Day", "Week", "Month"].map((t) => {
                const tLower = t.toLowerCase();
                return (
                  <button 
                    key={t} 
                    onClick={() => setRange(tLower)}
                    className={cn("px-4 py-1.5 text-xs font-semibold rounded-lg transition-all", range === tLower ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  >
                    {t}
                  </button>
                );
             })}
          </div>
          <button className="p-2.5 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-all">
            <Zap className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8 space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-6 rounded-2xl bg-card border border-border/50 hover:bg-card/80 transition-all duration-300 group relative shadow-sm hover:shadow-md"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <div className="p-2 bg-primary/10 rounded-lg group-hover:scale-110 transition-transform">
                      <stat.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", stat.trend === 'up' ? "bg-success/10 text-success" : "bg-red-500/10 text-red-500")}>
                      {stat.change}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-foreground">{stat.value}</h3>
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-8 rounded-[2rem] bg-card border border-border/50 shadow-sm h-[400px]"
          >
            <div className="flex justify-between items-start mb-8">
               <div className="space-y-1">
                 <h3 className="text-lg font-bold">Revenue Dynamics</h3>
                 <p className="text-xs text-muted-foreground">Historical performance trends</p>
               </div>
               <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-[10px] font-bold text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Current Cycle
               </div>
            </div>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} dx={-10} tickFormatter={(v) => `₹${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 10px 15px rgba(0,0,0,0.05)' }} 
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Secondary Stats & Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="p-8 rounded-[2rem] bg-card border border-border/50 shadow-sm space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">Inventory Spread</h3>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Global</p>
                </div>
                <div className="h-[240px] flex items-center justify-center relative">
                   <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-xl font-bold max-w-[120px] truncate text-center" title={statsData.total_revenue || "₹0"}>{statsData.total_revenue || "₹0"}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Revenue</p>
                   </div>
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ color: '#000', fontWeight: 'bold' }}
                            formatter={(value: any) => `₹${Number(value).toLocaleString()}`}
                         />
                         <Pie data={categoryData} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={8} dataKey="value" stroke="none">
                            {categoryData.map((_: any, index: number) => (
                              <Cell key={index} fill={COLORS[index % COLORS.length]} />
                            ))}
                         </Pie>
                      </PieChart>
                   </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   {categoryData.map((c: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-xl border border-border/20">
                         <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                         <span className="text-[10px] font-bold uppercase text-muted-foreground truncate">{c.name}</span>
                      </div>
                   ))}
                </div>
             </div>

             <div className="p-8 rounded-[2rem] bg-card border border-border/50 shadow-sm space-y-6">
                <div className="flex justify-between items-center">
                   <h3 className="text-lg font-bold">Top Store Items</h3>
                   <button className="p-2 bg-muted rounded-lg text-primary hover:bg-muted/80 transition-all">
                      <ChevronRight className="w-4 h-4" />
                   </button>
                </div>
                <div className="space-y-4">
                   {(data?.top_products || []).slice(0, 4).map((p: any, i: number) => (
                      <div key={i} className="flex items-center gap-4 p-4 hover:bg-muted/40 rounded-2xl transition-all border border-transparent hover:border-border/50 group">
                         <div className="w-11 h-11 rounded-xl bg-primary/5 flex items-center justify-center font-bold text-primary group-hover:bg-primary/10 transition-colors">
                            {p.product[0]}
                         </div>
                         <div className="flex-1">
                            <h4 className="text-sm font-bold text-foreground">{p.product}</h4>
                            <p className="text-[11px] font-medium text-muted-foreground">{p.revenue}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-xs font-bold text-success">+14%</p>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>
        </div>

        {/* Right Panel: The Digital Assistant (Chatbot Panel) */}
        <div className="xl:col-span-4 h-[600px] xl:h-[calc(100vh-14rem)] sticky top-28">
           <motion.div
             initial={{ opacity: 0, x: 10 }}
             animate={{ opacity: 1, x: 0 }}
             className="h-full flex flex-col bg-card border border-border/50 rounded-[2rem] shadow-sm relative overflow-hidden"
           >
             {/* Assistant Header */}
             <div className="p-6 border-b border-border/50 bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                         <Bot className="w-5 h-5 text-primary" />
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success border-2 border-card rounded-full" />
                   </div>
                   <div>
                      <h4 className="text-md font-bold text-foreground">AI Intelligence</h4>
                      <p className="text-[10px] font-bold text-success uppercase tracking-wider">Analysis Engine Live</p>
                   </div>
                </div>
             </div>

             {/* Chat History */}
             <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide" ref={scrollRef}>
                {messages.length === 0 && !isSending && (
                   <div className="h-full flex flex-col items-center justify-center text-center px-6 opacity-60">
                      <Sparkles className="w-12 h-12 text-primary/30 mb-4" />
                      <p className="text-md font-bold text-foreground mb-1">What can I analyze?</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">Ask about sales momentum or SKU efficiency metrics.</p>
                   </div>
                )}
                {messages.map((m: any, i: number) => (
                  <div key={i} className={cn("flex w-full gap-3", m.role === 'user' ? "justify-end" : "justify-start")}>
                    {m.role === 'assistant' && (
                       <div className="p-1.5 bg-primary/5 rounded-lg border border-primary/10 shrink-0 mt-0.5">
                          <Bot className="w-4 h-4 text-primary" />
                       </div>
                    )}
                    <div className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm font-medium",
                      m.role === 'user' ? "bg-primary text-white" : "bg-muted text-foreground"
                    )}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {isSending && (
                   <div className="flex justify-start gap-3">
                      <div className="p-1.5 bg-primary/5 rounded-lg border border-primary/10 shrink-0 mt-0.5">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                      <div className="bg-muted rounded-2xl px-5 py-3.5 flex items-center gap-1.5">
                         {[0, 1, 2].map((d) => (
                           <span key={d} className="w-1 h-1 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
                         ))}
                      </div>
                   </div>
                )}
             </div>

             {/* Interaction Area */}
             <div className="p-4 bg-muted/20 border-t border-border/50">
                <form className="relative flex items-center" onSubmit={handleSend}>
                   <input
                     value={input}
                     onChange={(e) => setInput(e.target.value)}
                     placeholder="Inquire about trends..."
                     className="w-full bg-card border border-border/60 rounded-xl pl-5 pr-12 py-3.5 text-sm font-medium focus:ring-1 focus:ring-primary shadow-inner placeholder:text-muted-foreground"
                   />
                   <button type="submit" disabled={!input.trim() || isSending} className="absolute right-1.5 p-2 bg-primary text-white rounded-lg shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 disabled:grayscale">
                      <Send className="w-4 h-4" />
                   </button>
                </form>
             </div>
           </motion.div>
        </div>
      </div>
    </div>
  );
}
