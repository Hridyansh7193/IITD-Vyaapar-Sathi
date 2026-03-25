"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Wallet, 
  TrendingDown, 
  TrendingUp, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  IndianRupee,
  Calendar,
  Zap,
  Briefcase,
  Home
} from "lucide-react";
import { cn } from "@/lib/utils";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

export default function LiquidityPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [loading, setLoading] = useState(false);

  // Edit Expense State
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Form states
  const [startingCapital, setStartingCapital] = useState("");
  
  // Bulk Expense State
  const [expensesForm, setExpensesForm] = useState({
     Rent: { amount: "", name: "Office Rent", isRecurring: true, day: "1" },
     Salary: { amount: "", name: "Employee Salaries", isRecurring: true, day: "1" },
     Electricity: { amount: "", name: "Electricity Bill", isRecurring: true, day: "1" },
     Miscellaneous: { amount: "", name: "Other Expenses", isRecurring: false, day: "1" }
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const { data: status, error: statusError } = useSWR(
    userId ? `http://localhost:8000/liquidity/status/${userId}` : null,
    fetcher
  );

  const { data: expenses } = useSWR(
    userId ? `http://localhost:8000/liquidity/expenses/${userId}` : null,
    fetcher
  );

  const handleInitWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startingCapital || !userId) return;
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/liquidity/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          starting_capital: parseFloat(startingCapital)
        })
      });
      if (!res.ok) throw new Error("Failed to initialize");
      toast.success("Capital updated successfully!");
      mutate(`http://localhost:8000/liquidity/status/${userId}`);
    } catch (err) {
      toast.error("Error updating capital.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpenses = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setLoading(true);

    try {
      // Create bulk promises for all categories with a valid amount
      const promises = Object.entries(expensesForm).map(async ([category, data]) => {
         if (!data.amount || parseFloat(data.amount) <= 0) return null;
         
         return fetch("http://localhost:8000/liquidity/expense", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: userId,
              name: data.name,
              amount: parseFloat(data.amount),
              category: category,
              is_recurring: data.isRecurring,
              recurring_day: data.isRecurring ? parseInt(data.day) : null
            })
          });
      });

      const results = (await Promise.all(promises)).filter(r => r !== null);
      
      // Check if at least one was submitted
      if (results.length === 0) {
         toast.error("Please enter at least one expense amount.");
         return;
      }
      
      const allOk = results.every((r: any) => r.ok);
      if (!allOk) throw new Error("Some expenses failed to save");

      toast.success("Monthly expenses successfully logged!");
      setShowAddExpense(false);
      
      // Reset form
      setExpensesForm({
         Rent: { amount: "", name: "Office Rent", isRecurring: true, day: "1" },
         Salary: { amount: "", name: "Employee Salaries", isRecurring: true, day: "1" },
         Electricity: { amount: "", name: "Electricity Bill", isRecurring: true, day: "1" },
         Miscellaneous: { amount: "", name: "Other Expenses", isRecurring: false, day: "1" }
      });
      
      mutate(`http://localhost:8000/liquidity/status/${userId}`);
      mutate(`http://localhost:8000/liquidity/expenses/${userId}`);
    } catch (err) {
      toast.error("Error adding expenses.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    setEditLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/liquidity/expense/${editingExpense.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingExpense.name,
          amount: parseFloat(editingExpense.amount),
          category: editingExpense.category,
          is_recurring: editingExpense.is_recurring,
          recurring_day: editingExpense.is_recurring ? parseInt(editingExpense.recurring_day || "1") : null
        })
      });
      if (!res.ok) throw new Error("Failed to update expense");
      toast.success("Expense updated!");
      setEditingExpense(null);
      mutate(`http://localhost:8000/liquidity/status/${userId}`);
      mutate(`http://localhost:8000/liquidity/expenses/${userId}`);
    } catch (err) {
      toast.error("Error updating expense.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!editingExpense) return;
    if (!confirm("Are you sure you want to delete this expense?")) return;
    setEditLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/liquidity/expense/${editingExpense.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete expense");
      toast.success("Expense deleted!");
      setEditingExpense(null);
      mutate(`http://localhost:8000/liquidity/status/${userId}`);
      mutate(`http://localhost:8000/liquidity/expenses/${userId}`);
    } catch (err) {
      toast.error("Error deleting expense.");
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Liquidity Tracker</h2>
          <p className="text-muted-foreground text-sm font-medium">Manage your capital, operational expenses, and runway projections.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowAddExpense(!showAddExpense)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Status Panel */}
        <div className="lg:col-span-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-card border border-border/50 rounded-2xl shadow-sm">
              <div className="flex flex-col gap-2">
                <div className="p-2 bg-primary/10 w-fit rounded-lg"><Wallet className="w-5 h-5 text-primary" /></div>
                <h3 className="text-sm font-semibold text-muted-foreground">Current Liquidity</h3>
                <p className="text-2xl font-bold">₹{status?.current_liquidity?.toLocaleString() || "0"}</p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-6 bg-card border border-border/50 rounded-2xl shadow-sm">
                <div className="flex flex-col gap-2">
                  <div className="p-2 bg-red-500/10 w-fit rounded-lg"><TrendingDown className="w-5 h-5 text-red-500" /></div>
                  <h3 className="text-sm font-semibold text-muted-foreground">Monthly Burn</h3>
                  <p className="text-2xl font-bold text-red-500">₹{status?.monthly_burn?.toLocaleString() || "0"}</p>
                </div>
            </motion.div>

            <motion.div 
               initial={{ opacity: 0, y: 10 }} 
               animate={{ opacity: 1, y: 0 }} 
               transition={{ delay: 0.2 }} 
               className={cn(
                 "p-6 border rounded-2xl shadow-sm",
                 status?.status_token === 'SAFE' ? "bg-green-500/5 border-green-500/20" :
                 status?.status_token === 'CAUTION' ? "bg-yellow-500/5 border-yellow-500/20" : "bg-red-500/5 border-red-500/20"
               )}
            >
                <div className="flex flex-col gap-2">
                  <div className={cn(
                    "p-2 w-fit rounded-lg",
                    status?.status_token === 'SAFE' ? "bg-green-500/10" : "bg-red-500/10"
                  )}>
                    <Clock className={cn("w-5 h-5", status?.status_token === 'SAFE' ? "text-green-500" : "text-red-500")} />
                  </div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase">Estimated Runway</h3>
                  <p className={cn("text-2xl font-bold", status?.status_token === 'SAFE' ? "text-green-500" : "text-red-500")}>
                    {status?.days_remaining === 999 ? "∞ Safe" : `${status?.days_remaining} Days`}
                  </p>
                </div>
            </motion.div>
          </div>

          <AnimatePresence>
            {showAddExpense && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-8 bg-card border border-primary/20 rounded-3xl shadow-xl space-y-6">
                  <h3 className="text-xl font-bold">Log Monthly Expenses</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">Ensure all standard operational costs are tracked. Leave blank if 0.</p>
                  
                  <form onSubmit={handleAddExpenses} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       
                       {/* Rent */}
                       <div className="space-y-3 bg-muted/20 p-4 rounded-2xl border border-border/50">
                          <div className="flex items-center gap-2">
                             <Home className="w-4 h-4 text-primary" />
                             <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Office Rent</label>
                          </div>
                          <input 
                            type="number" value={expensesForm.Rent.amount} onChange={e => setExpensesForm(p => ({...p, Rent: {...p.Rent, amount: e.target.value}}))}
                            className="w-full bg-background border-border rounded-xl px-4 py-3 font-semibold" placeholder="₹ Amount"
                          />
                          <div className="flex items-center gap-2 text-xs">
                             <input type="checkbox" checked={expensesForm.Rent.isRecurring} onChange={e => setExpensesForm(p => ({...p, Rent: {...p.Rent, isRecurring: e.target.checked}}))} />
                             <span>Monthly on Day</span>
                             <input type="number" min="1" max="31" value={expensesForm.Rent.day} onChange={e => setExpensesForm(p => ({...p, Rent: {...p.Rent, day: e.target.value}}))} className="w-12 bg-background border border-border rounded px-2" disabled={!expensesForm.Rent.isRecurring}/>
                          </div>
                       </div>

                       {/* Salary */}
                       <div className="space-y-3 bg-muted/20 p-4 rounded-2xl border border-border/50">
                          <div className="flex items-center gap-2">
                             <Briefcase className="w-4 h-4 text-primary" />
                             <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Employee Salaries</label>
                          </div>
                          <input 
                            type="number" value={expensesForm.Salary.amount} onChange={e => setExpensesForm(p => ({...p, Salary: {...p.Salary, amount: e.target.value}}))}
                            className="w-full bg-background border-border rounded-xl px-4 py-3 font-semibold" placeholder="₹ Total Payroll"
                          />
                          <div className="flex items-center gap-2 text-xs">
                             <input type="checkbox" checked={expensesForm.Salary.isRecurring} onChange={e => setExpensesForm(p => ({...p, Salary: {...p.Salary, isRecurring: e.target.checked}}))} />
                             <span>Monthly on Day</span>
                             <input type="number" min="1" max="31" value={expensesForm.Salary.day} onChange={e => setExpensesForm(p => ({...p, Salary: {...p.Salary, day: e.target.value}}))} className="w-12 bg-background border border-border rounded px-2" disabled={!expensesForm.Salary.isRecurring}/>
                          </div>
                       </div>

                       {/* Electricity */}
                       <div className="space-y-3 bg-muted/20 p-4 rounded-2xl border border-border/50">
                          <div className="flex items-center gap-2">
                             <Zap className="w-4 h-4 text-primary" />
                             <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Electricity & Utilities</label>
                          </div>
                          <input 
                            type="number" value={expensesForm.Electricity.amount} onChange={e => setExpensesForm(p => ({...p, Electricity: {...p.Electricity, amount: e.target.value}}))}
                            className="w-full bg-background border-border rounded-xl px-4 py-3 font-semibold" placeholder="₹ Average Bill"
                          />
                          <div className="flex items-center gap-2 text-xs">
                             <input type="checkbox" checked={expensesForm.Electricity.isRecurring} onChange={e => setExpensesForm(p => ({...p, Electricity: {...p.Electricity, isRecurring: e.target.checked}}))} />
                             <span>Monthly on Day</span>
                             <input type="number" min="1" max="31" value={expensesForm.Electricity.day} onChange={e => setExpensesForm(p => ({...p, Electricity: {...p.Electricity, day: e.target.value}}))} className="w-12 bg-background border border-border rounded px-2" disabled={!expensesForm.Electricity.isRecurring}/>
                          </div>
                       </div>

                       {/* Misc */}
                       <div className="space-y-3 bg-muted/20 p-4 rounded-2xl border border-border/50">
                          <div className="flex items-center gap-2">
                             <Plus className="w-4 h-4 text-primary" />
                             <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Miscellaneous / Ad-Hoc</label>
                          </div>
                          <input 
                            type="number" value={expensesForm.Miscellaneous.amount} onChange={e => setExpensesForm(p => ({...p, Miscellaneous: {...p.Miscellaneous, amount: e.target.value}}))}
                            className="w-full bg-background border-border rounded-xl px-4 py-3 font-semibold" placeholder="₹ Amount"
                          />
                          <div className="flex items-center gap-2 text-xs">
                             <input type="text" value={expensesForm.Miscellaneous.name} onChange={e => setExpensesForm(p => ({...p, Miscellaneous: {...p.Miscellaneous, name: e.target.value}}))} className="w-full bg-background border border-border rounded px-2" placeholder="Describe short expense"/>
                          </div>
                       </div>

                    </div>
                    
                    <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
                       <button type="button" onClick={() => setShowAddExpense(false)} className="px-6 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-all">Cancel</button>
                       <button type="submit" disabled={loading} className="px-8 py-2.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">Save All Expenses</button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-8 bg-card border border-border/50 rounded-[2rem] shadow-sm">
             <h3 className="text-xl font-bold mb-6">Expense List</h3>
             <div className="space-y-4">
               {expenses?.length === 0 && <p className="text-center py-12 text-muted-foreground italic">No expenses logged yet.</p>}
               {expenses?.map((ex: any) => (
                 <div 
                   key={ex.id} 
                   onClick={() => setEditingExpense({...ex})}
                   className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-transparent hover:border-primary/50 hover:bg-muted/50 transition-all group cursor-pointer"
                 >
                   <div className="flex items-center gap-4">
                     <div className="p-3 bg-white rounded-xl shadow-sm group-hover:bg-primary/5 transition-colors">
                        {ex.category === 'Rent' && <Home className="w-5 h-5 text-primary" />}
                        {ex.category === 'Salary' && <Briefcase className="w-5 h-5 text-primary" />}
                        {ex.category === 'Electricity' && <Zap className="w-5 h-5 text-primary" />}
                        {ex.category === 'Miscellaneous' && <Plus className="w-5 h-5 text-primary" />}
                     </div>
                     <div>
                        <h4 className="font-bold text-sm">{ex.name}</h4>
                        <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                           <span>{ex.category}</span>
                           <span>•</span>
                           {ex.is_recurring ? (
                             <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Monthly On Day {ex.recurring_day}</span>
                           ) : (
                             <span>One-time</span>
                           )}
                        </div>
                     </div>
                   </div>
                   <div className="text-right flex items-center justify-end gap-3">
                      <p className="font-black">₹{ex.amount.toLocaleString()}</p>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                         <span className="text-xs font-bold text-primary group-hover:underline">Edit</span>
                      </div>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Sidebar Panel: Capital Update */}
        <div className="lg:col-span-4 space-y-8">
           <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-8 bg-card border border-border/50 rounded-[2rem] shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                 <div className="p-2.5 bg-success/10 rounded-xl"><IndianRupee className="w-5 h-5 text-success" /></div>
                 <h3 className="text-lg font-bold">Update Capital</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">Enter your starting cash-on-hand. All profits and expenses will be calculated from this baseline.</p>
              
              <form onSubmit={handleInitWallet} className="space-y-4">
                 <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <input 
                      type="number" value={startingCapital} onChange={e => setStartingCapital(e.target.value)}
                      placeholder="e.g. 500000"
                      className="w-full bg-muted/40 border-border rounded-2xl pl-10 pr-4 py-4 font-bold text-lg"
                    />
                 </div>
                 <button 
                   type="submit" disabled={loading}
                   className="w-full py-4 bg-success text-white rounded-2xl font-bold shadow-lg shadow-success/20 hover:scale-[1.02] active:scale-98 transition-all"
                 >
                   Save Balance
                 </button>
              </form>
           </motion.div>

           <div className="p-8 bg-primary/5 border border-primary/20 rounded-[2rem] space-y-4">
              <div className="flex items-center gap-3">
                 <AlertTriangle className="w-5 h-5 text-primary" />
                 <h4 className="font-bold">Prediction Logic</h4>
              </div>
              <p className="text-xs text-primary/70 leading-relaxed font-medium">
                Our AI model analyzes your last 30 days of sales profit against your monthly fixed burn (Rent+Salary). 
                If your daily spend exceeds daily profit, your runway shows estimated exhaustion days.
              </p>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {editingExpense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl relative"
            >
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-bold">Edit Expense</h3>
                 <button onClick={() => setEditingExpense(null)} className="text-muted-foreground hover:text-foreground">
                    ✕
                 </button>
              </div>

              <form onSubmit={handleUpdateExpense} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Expense Name</label>
                  <input 
                    type="text" 
                    required
                    value={editingExpense.name} 
                    onChange={e => setEditingExpense({...editingExpense, name: e.target.value})}
                    className="w-full bg-background border-border rounded-xl px-4 py-3"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount (₹)</label>
                  <input 
                    type="number" 
                    required
                    value={editingExpense.amount} 
                    onChange={e => setEditingExpense({...editingExpense, amount: e.target.value})}
                    className="w-full bg-background border-border rounded-xl px-4 py-3"
                  />
                </div>

                <div className="space-y-2 flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border/50">
                  <span className="text-sm font-semibold">Recurring Monthly?</span>
                  <input 
                    type="checkbox" 
                    checked={editingExpense.is_recurring} 
                    onChange={e => setEditingExpense({...editingExpense, is_recurring: e.target.checked})}
                    className="w-5 h-5 accent-primary"
                  />
                </div>

                {editingExpense.is_recurring && (
                   <div className="space-y-2">
                     <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Billing Day (1-31)</label>
                     <input 
                       type="number" 
                       min="1" max="31"
                       value={editingExpense.recurring_day || ""} 
                       onChange={e => setEditingExpense({...editingExpense, recurring_day: e.target.value})}
                       className="w-full bg-background border-border rounded-xl px-4 py-3"
                     />
                   </div>
                )}

                <div className="flex gap-3 pt-6 border-t border-border mt-6">
                   <button 
                     type="button" 
                     onClick={handleDeleteExpense} 
                     disabled={editLoading}
                     className="px-4 py-3 text-red-500 bg-red-500/10 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all flex-1"
                   >
                     <Trash2 className="w-4 h-4" /> Delete
                   </button>
                   <button 
                     type="submit" 
                     disabled={editLoading}
                     className="px-4 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:shadow-lg transition-all flex-1"
                   >
                     {editLoading ? "Saving..." : "Save Changes"}
                   </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
