"use client";

import React, { useState } from "react";
import { getApiUrl } from "@/lib/utils";
import { Loader2, Sparkles, Plus, Trash, Check, AlertCircle } from "lucide-react";

interface AIParsedItem {
  product_name: string;
  quantity: number;
  cost_price: number;
  selling_price: number;
  category: string;
  confidence: number;
}

const AIInventoryEntry = ({ userId }: { userId: string }) => {
  const [inputText, setInputText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [parsedItems, setParsedItems] = useState<AIParsedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleParse = async () => {
    if (!inputText.trim()) return;
    setIsParsing(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`${getApiUrl()}/ai/parse-inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, raw_text: inputText }),
      });

      const data = await res.json();
      if (data.intent === "ADD_INVENTORY" && data.items.length > 0) {
        setParsedItems(data.items);
      } else {
        setError("AI couldn't understand the items. Try being more specific!");
      }
    } catch (err) {
      setError("Failed to connect to AI server.");
    } finally {
      setIsParsing(false);
    }
  };

  const updateItem = (index: number, field: keyof AIParsedItem, value: any) => {
    const updated = [...parsedItems];
    (updated[index] as any)[field] = value;
    setParsedItems(updated);
  };

  const removeItem = (index: number) => {
    setParsedItems(parsedItems.filter((_, i) => i !== index));
  };

  const confirmAddToLedger = async () => {
    if (parsedItems.length === 0) return;
    setIsAdding(true);
    let successCount = 0;

    try {
      for (const item of parsedItems) {
        const payload = {
          user_id: userId,
          name: item.product_name,
          barcode: "", // Empty barcode allows backend to match by name
          category: item.category,
          stock_quantity: item.quantity,
          cost_price: item.cost_price,
          selling_price: item.selling_price,
        };

        const res = await fetch(`${getApiUrl()}/v2/inventory/add`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) successCount++;
      }

      if (successCount === parsedItems.length) {
        setSuccess(true);
        setParsedItems([]);
        setInputText("");
      } else {
        setError(`Saved ${successCount} out of ${parsedItems.length} items.`);
      }
    } catch (err) {
      setError("Failed to add inventory to ledger.");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-primary/20 shadow-xl rounded-3xl overflow-hidden p-6 glass-effect animate-in fade-in duration-500">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-bold">AI Smart Entry</h3>
        </div>
        
        <div className="flex flex-col gap-4">
          <textarea
            className="w-full min-h-[100px] p-4 rounded-xl border border-border bg-background/50 focus:ring-2 focus:ring-primary outline-none transition-all resize-none shadow-inner text-sm font-medium"
            placeholder="e.g., 'Add 15 Packets of Lays at 20 each, sell at 25' or 'Received 10 milk for 30rs'"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isParsing || isAdding}
          />
          <button 
            onClick={handleParse} 
            disabled={isParsing || !inputText.trim()}
            className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
          >
            {isParsing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Extract Items
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-red-600 flex items-center gap-2 animate-in slide-in-from-top-2 text-sm font-medium">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 font-medium flex items-center gap-2 animate-in zoom-in-95 text-sm">
          <Check className="w-5 h-5" />
          Successfully added to Ledger!
        </div>
      )}

      {parsedItems.length > 0 && (
        <div className="grid gap-4 animate-in slide-in-from-bottom-4 duration-500">
          <h3 className="text-lg font-bold px-2 pt-2">Preview & Edit Items</h3>
          {parsedItems.map((item, idx) => (
            <div key={idx} className="bg-card border border-border rounded-2xl p-6 hover:border-primary transition-colors overflow-hidden shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-1 space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Product</label>
                  <input 
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-primary transition-all"
                    value={item.product_name} 
                    onChange={(e) => updateItem(idx, 'product_name', e.target.value)} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Qty</label>
                  <input 
                    type="number" 
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-primary transition-all"
                    value={item.quantity} 
                    onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value))} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Cost (₹)</label>
                  <input 
                    type="number" 
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-primary transition-all"
                    value={item.cost_price} 
                    onChange={(e) => updateItem(idx, 'cost_price', parseFloat(e.target.value))} 
                  />
                </div>
                <div className="flex gap-2">
                  <div className="space-y-1 flex-1">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Sell (₹)</label>
                      <input 
                        type="number" 
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-primary transition-all"
                        value={item.selling_price} 
                        onChange={(e) => updateItem(idx, 'selling_price', parseFloat(e.target.value))} 
                      />
                  </div>
                  <button onClick={() => removeItem(idx)} className="h-10 w-10 flex items-center justify-center text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                    <Trash className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          <button 
            className="w-full h-14 flex items-center justify-center gap-2 rounded-2xl bg-green-600 text-white font-bold text-lg shadow-xl hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50"
            onClick={confirmAddToLedger}
            disabled={isAdding}
          >
            {isAdding ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Plus className="h-6 w-6" />
            )}
            Confirm {parsedItems.length} Items to Ledger
          </button>
        </div>
      )}
    </div>
  );
};

export default AIInventoryEntry;
