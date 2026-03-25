"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Package, Search, AlertCircle, Box, LayoutGrid } from "lucide-react";
import { getApiUrl } from "@/lib/utils";
import AIInventoryEntry from "@/components/inventory/AIInventoryEntry";

type InventoryItem = {
  name: string;
  category: string;
  stock_quantity: number;
  sku: string;
  reorder_level?: number;
  days_inactive?: number;
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        
        if (!data.user) {
          setLoading(false);
          return;
        }

        setUserId(data.user.id);
        const res = await fetch(`${getApiUrl()}/inventory/list/${data.user.id}`);
        if (res.ok) {
          const json = await res.json();
          setItems(json.sort((a: InventoryItem, b: InventoryItem) => (a.name || "").localeCompare(b.name || "")));
        }
      } catch (err) {
        console.error("Failed to fetch inventory", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, []);

  const filteredItems = items.filter(
    (item) =>
      (item.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category || "").toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const handleUpdateRol = async (sku: string, currentRol: number) => {
    const newVal = prompt(`Set minimum Reorder Level (current: ${currentRol})`, currentRol.toString());
    if (newVal === null) return;
    const num = parseInt(newVal, 10);
    if (isNaN(num)) return;
    
    try {
        await fetch(`${getApiUrl()}/inventory/update-reorder`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ sku: sku, user_id: userId, reorder_level: num })
        });
        setItems(prev => prev.map(i => i.sku === sku ? {...i, reorder_level: num} : i));
    } catch (e) {
        console.error(e);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Package className="w-8 h-8 text-primary" />
            My Active Inventory
          </h2>
          <p className="text-muted-foreground mt-2 font-medium">
            Monitor your current stock levels. Pricing data is hidden here.
          </p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-72 pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium text-sm"
          />
        </div>
      </div>

      {/* AI Smart Entry Section */}
      {userId && (
        <AIInventoryEntry userId={userId} />
      )}

      {/* Main Table Card */}
      <div className="bg-card border border-border shadow-sm rounded-3xl overflow-hidden">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 text-muted-foreground">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
            <p className="font-bold animate-pulse">Loading secure vault...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
              <Box className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">No items found</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Your inventory is currently empty. Head over to the Upload section to receive stock.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="py-4 px-6 font-bold text-xs uppercase tracking-wider text-muted-foreground">Product</th>
                  <th className="py-4 px-6 font-bold text-xs uppercase tracking-wider text-muted-foreground">Category</th>
                  <th className="py-4 px-6 font-bold text-xs uppercase tracking-wider text-muted-foreground text-right w-32">In Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <LayoutGrid className="w-5 h-5 text-primary" />
                          </div>
                          <span className="font-bold text-foreground">{item.name || "Unnamed Product"}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                           <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-muted border border-border">
                             {item.category || "General"}
                           </span>
                           {item.days_inactive && item.days_inactive > 90 && (
                             <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-full bg-red-500/10 text-red-500 border border-red-500/20 shadow-sm animate-pulse">
                                Dead Stock
                             </span>
                           )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2 group cursor-pointer" onClick={() => handleUpdateRol(item.sku, item.reorder_level || 5)}>
                          <span className={`text-lg font-black ${(item.stock_quantity <= (item.reorder_level || 5)) ? "text-red-500" : "text-foreground"}`}>
                            {item.stock_quantity.toLocaleString()}
                          </span>
                          {(item.stock_quantity <= (item.reorder_level || 5)) && (
                             <span title="Below Reorder Level!">
                               <AlertCircle className="w-4 h-4 text-red-500" />
                             </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-muted-foreground font-medium">
                      No matching products found for "{searchQuery}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
