"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scan, PackagePlus, ShoppingCart, CheckCircle, X, UploadCloud } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

export default function AdvancedScanner() {
  const [mode, setMode] = useState<"sale" | "receive">("sale");
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userId, setUserId] = useState("00000000-0000-0000-0000-000000000000");
  
  // Advanced Modal State
  const [showModal, setShowModal] = useState(false);
  const [productData, setProductData] = useState({ 
    name: "", 
    category: "General", 
    selling_price: 0, 
    cost_price: 0,
    stock_quantity: 1,
    isExisting: false // Determines if name/category should be readonly
  });

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    };
    getUser();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (isProcessing || showModal) return;
      
      const file = e.target.files[0];
      setIsProcessing(true);
      
      try {
        const html5QrCode = new Html5Qrcode("reader-hidden-v2");
        const decodedText = await html5QrCode.scanFile(file, true);
        
        setScannedBarcode(decodedText);
        html5QrCode.clear();
        
        if (mode === "sale") {
           await processSale(decodedText);
        } else {
           await processReceive(decodedText);
        }
      } catch (err) {
        toast.error("Could not parse a valid barcode.");
      } finally {
        setTimeout(() => setIsProcessing(false), 1000);
      }
      
      e.target.value = '';
    }
  };

  const processSale = async (barcode: string) => {
    const res = await fetch(`http://localhost:8000/v2/products/${userId}/${barcode}`);
    const data = await res.json();
    if (data.exists) {
      setProductData({
        name: data.product.name,
        category: data.product.category,
        selling_price: data.product.selling_price || 0,
        cost_price: data.product.cost_price || 0,
        stock_quantity: 1,
        isExisting: true
      });
      setShowModal(true);
    } else {
      toast.error("Product not found in inventory. Please receive it first.");
    }
  };

  const processReceive = async (barcode: string) => {
    // Check v2 endpoints which return explicit cost_price
    const res = await fetch(`http://localhost:8000/v2/products/${userId}/${barcode}`);
    const data = await res.json();

    if (data.exists) {
      setProductData({
        name: data.product.name,
        category: data.product.category,
        selling_price: data.product.selling_price || 0,
        cost_price: data.product.cost_price || 0,
        stock_quantity: 1, // Default to receiving 1
        isExisting: true
      });
      setShowModal(true);
    } else {
      setProductData({
        name: "",
        category: "General",
        selling_price: 0,
        cost_price: 0,
        stock_quantity: 1,
        isExisting: false
      });
      setShowModal(true);
    }
  };

  const handleModalSubmit = async () => {
    if (mode === "sale") {
      if (productData.selling_price < 0 || productData.stock_quantity <= 0) {
        toast.error("Valid selling price and quantity required");
        return;
      }
      try {
        const res = await fetch("http://localhost:8000/v2/sales/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            barcode: scannedBarcode,
            user_id: userId,
            quantity: productData.stock_quantity,
            selling_price: productData.selling_price
          })
        });
        const data = await res.json();
        if (res.ok) {
          toast.success(`Sale Logged! Revenue: ₹${data.revenue}`);
          setShowModal(false);
        } else {
          toast.error(data.detail || "Sale failed!");
        }
      } catch (err) {
        toast.error("Network error");
      }
    } else {
      // mode === "receive"
      if (!productData.name || productData.cost_price < 0 || productData.stock_quantity <= 0) {
        toast.error("Valid name, cost price, and quantity required");
        return;
      }
      try {
        const res = await fetch("http://localhost:8000/v2/inventory/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            barcode: scannedBarcode,
            user_id: userId,
            ...productData
          })
        });
        if (res.ok) {
          toast.success("Inventory updated with Cost Price!");
          setShowModal(false);
        } else {
          toast.error("Failed to save inventory.");
        }
      } catch (err: any) {
        toast.error("Network error");
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Advanced Scanner</h2>
        <p className="text-muted-foreground mt-2">Cost-aware POS scanner for pinpoint profit accuracy.</p>
      </div>

      <div className="flex bg-muted/30 p-1.5 rounded-2xl w-full max-w-sm mb-6 border border-border">
         <button
            onClick={() => setMode("sale")}
            className={`flex-1 flex items-center justify-center py-2.5 rounded-xl text-sm font-bold transition-all ${mode === "sale" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted/50"}`}
         >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Checkout Sale
         </button>
         <button
            onClick={() => setMode("receive")}
            className={`flex-1 flex items-center justify-center py-2.5 rounded-xl text-sm font-bold transition-all ${mode === "receive" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted/50"}`}
         >
            <PackagePlus className="w-4 h-4 mr-2" />
            Receive Stock
         </button>
      </div>

      <div className="bg-card border border-border rounded-3xl p-6 lg:p-10 shadow-sm relative overflow-hidden">
        <div className="flex flex-col items-center">
            <div className="w-full max-w-md mx-auto aspect-video bg-muted/10 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-all group relative cursor-pointer">
               <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
               <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                 <UploadCloud className="w-8 h-8 text-primary" />
               </div>
               <h3 className="font-bold text-lg mb-1">Upload Barcode Image</h3>
               <p className="text-sm text-muted-foreground">Click or Drag to process via V2 Engine</p>
            </div>
            <div id="reader-hidden-v2" style={{ display: "none" }}></div>
        </div>
      </div>

      {/* Advanced Full Screen Modal */}
      <AnimatePresence>
        {showModal && (
           <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
           >
              <motion.div 
                 initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                 className="bg-card border border-border shadow-2xl rounded-3xl p-6 md:p-8 w-full max-w-md"
              >
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="text-xl font-bold">
                        {mode === "sale" ? "Finalize Checkout" : (productData.isExisting ? "Update Existing Stock" : "Define New Product")}
                     </h3>
                     <button onClick={() => setShowModal(false)} className="bg-muted p-2 rounded-full hover:bg-red-500/10 hover:text-red-500 transition-colors">
                        <X className="w-5 h-5"/>
                     </button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">Barcode: <span className="font-mono bg-muted px-2 py-0.5 rounded">{scannedBarcode}</span></p>
                  
                  <div className="space-y-4">
                     <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Product Name</label>
                        <input type="text" readOnly={productData.isExisting || mode === "sale"} value={productData.name} onChange={e => setProductData(prev => ({...prev, name: e.target.value}))} className={`w-full border px-4 py-3 rounded-xl outline-none transition-colors ${(productData.isExisting || mode === "sale") ? 'bg-muted cursor-not-allowed border-transparent' : 'bg-background border-border focus:border-primary'}`} placeholder="Product Name" />
                     </div>

                     <div className="flex gap-4 border-t border-border pt-4 mt-2">
                        {mode === "receive" && (
                          <div className="flex-1">
                             <label className="text-xs font-bold text-blue-500 uppercase mb-1 block">Cost Price (₹)</label>
                             <input type="number" min="0" value={productData.cost_price || ''} onChange={e => setProductData(prev => ({...prev, cost_price: parseFloat(e.target.value) || 0}))} className="w-full bg-blue-500/5 border border-blue-500/20 px-4 py-3 rounded-xl outline-none focus:border-blue-500 transition-colors" placeholder="0" />
                          </div>
                        )}
                        {mode === "sale" && (
                          <div className="flex-1">
                             <label className="text-xs font-bold text-green-500 uppercase mb-1 block">Selling Price (₹)</label>
                             <input type="number" min="0" value={productData.selling_price || ''} onChange={e => setProductData(prev => ({...prev, selling_price: parseFloat(e.target.value) || 0}))} className="w-full bg-green-500/5 border border-green-500/20 px-4 py-3 rounded-xl outline-none focus:border-green-500 transition-colors" placeholder="0" />
                          </div>
                        )}
                     </div>

                     <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">{mode === "receive" ? "Qty Received" : "Qty Sold"}</label>
                        <input type="number" min="1" value={productData.stock_quantity || ''} onChange={e => setProductData(prev => ({...prev, stock_quantity: parseInt(e.target.value) || 1}))} className="w-full bg-background border border-border px-4 py-3 rounded-xl outline-none focus:border-primary transition-colors" placeholder="e.g. 1" />
                     </div>

                     <button onClick={handleModalSubmit} className="w-full py-3.5 bg-primary text-primary-foreground font-bold rounded-xl mt-4 hover:shadow-lg hover:shadow-primary/20 transition-all flex justify-center items-center">
                        <CheckCircle className="w-5 h-5 mr-2" /> {mode === "sale" ? "Log Checkout" : "Save to Inventory Ledger"}
                     </button>
                  </div>
              </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
