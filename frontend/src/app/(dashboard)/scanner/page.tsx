"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scan, PackagePlus, ShoppingCart, CheckCircle, AlertCircle, X, UploadCloud } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

export default function ScannerPage() {
  const [mode, setMode] = useState<"sale" | "receive">("sale");
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userId, setUserId] = useState("00000000-0000-0000-0000-000000000000");
  
  // New Product Modal State
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", category: "General", price: 0, stock_quantity: 1 });

  useEffect(() => {
    // Get real user id
    const getUser = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    };
    getUser();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (isProcessing || showNewProductModal) return;
      
      const file = e.target.files[0];
      setIsProcessing(true);
      
      try {
        const html5QrCode = new Html5Qrcode("reader-hidden");
        const decodedText = await html5QrCode.scanFile(file, true);
        
        setScannedBarcode(decodedText);
        html5QrCode.clear();
        
        if (mode === "sale") {
           await processSale(decodedText);
        } else {
           await processReceive(decodedText);
        }
      } catch (err) {
        toast.error("Could not parse a valid barcode from this image. Please try a clearer picture.");
      } finally {
        setTimeout(() => setIsProcessing(false), 1000);
      }
      
      // Reset input value to allow uploading the same file again if needed
      e.target.value = '';
    }
  };

  const processSale = async (barcode: string) => {
    const res = await fetch("http://localhost:8000/sales/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barcode, user_id: userId, quantity: 1 })
    });
    const data = await res.json();
    if (!res.ok) {
       toast.error(data.detail || "Sale failed!");
    } else {
       toast.success(`Sale Logged! Revenue: ₹${data.revenue}`);
    }
  };

  const processReceive = async (barcode: string) => {
    // First figure out if product exists
    const res = await fetch(`http://localhost:8000/products/${userId}/${barcode}`);
    const data = await res.json();

    if (data.exists) {
      const addRes = await fetch("http://localhost:8000/inventory/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode, user_id: userId, stock_quantity: 1 })
      });
      if (addRes.ok) {
        toast.success(`Added 1 unit to inventory of ${data.product.name}`);
      } else {
         toast.error("Failed to add inventory");
      }
    } else {
      setShowNewProductModal(true);
    }
  };

  const submitNewProduct = async () => {
    if (!newProduct.name || newProduct.price <= 0) {
      toast.error("Valid name and price required");
      return;
    }
    
    try {
      const res = await fetch("http://localhost:8000/inventory/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: scannedBarcode,
          user_id: userId,
          ...newProduct
        })
      });
      if (res.ok) {
        toast.success("New product saved and added to inventory!");
        setShowNewProductModal(false);
        setNewProduct({ name: "", category: "General", price: 0, stock_quantity: 1 });
      } else {
        toast.error("Failed to save product.");
      }
    } catch (err: any) {
      toast.error("Network error");
    }
  };


  return (
    <div className="max-w-4xl mx-auto pb-20 space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Scanner POS</h2>
        <p className="text-muted-foreground mt-2">Upload pictures of barcodes for instant point-of-sale and inventory updates.</p>
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
               <p className="text-sm text-muted-foreground">Click or Drag an image here to scan</p>
            </div>

            <div id="reader-hidden" style={{ display: "none" }}></div>
            
            <p className="text-sm font-semibold text-muted-foreground mt-8 flex items-center">
              {isProcessing ? (
                <span className="flex items-center text-primary animate-pulse"><Scan className="w-4 h-4 mr-2" /> Analyzing Barcode Image...</span>
              ) : (
                <span className="flex items-center"><Scan className="w-4 h-4 mr-2" /> Upload an image to {mode === "sale" ? "checkout" : "add inventory"}</span>
              )}
            </p>
        </div>
      </div>

      {/* New Product Modal */}
      <AnimatePresence>
        {showNewProductModal && (
           <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
           >
              <motion.div 
                 initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                 className="bg-card border border-border shadow-2xl rounded-3xl p-6 md:p-8 w-full max-w-md"
              >
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-xl font-bold">New Product Scanned!</h3>
                     <button onClick={() => setShowNewProductModal(false)} className="bg-muted p-2 rounded-full hover:bg-red-500/10 hover:text-red-500 transition-colors">
                        <X className="w-5 h-5"/>
                     </button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">Barcode <span className="font-mono bg-muted px-2 py-0.5 rounded">{scannedBarcode}</span> wasn't strictly found in your DB. Define it now to add inventory.</p>
                  
                  <div className="space-y-4">
                     <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Product Name</label>
                        <input type="text" value={newProduct.name} onChange={e => { const val = e.target.value; setNewProduct(prev => ({...prev, name: val})); }} className="w-full bg-background border border-border px-4 py-3 rounded-xl outline-none focus:border-primary transition-colors" placeholder="e.g. Coca Cola 1L" />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Category</label>
                        <input type="text" value={newProduct.category} onChange={e => { const val = e.target.value; setNewProduct(prev => ({...prev, category: val})); }} className="w-full bg-background border border-border px-4 py-3 rounded-xl outline-none focus:border-primary transition-colors" placeholder="e.g. Beverages" />
                     </div>
                     <div className="flex gap-4">
                       <div className="flex-1">
                          <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Price (₹)</label>
                          <input type="number" min="0" value={newProduct.price || ''} onChange={e => { const val = parseFloat(e.target.value) || 0; setNewProduct(prev => ({...prev, price: val})); }} className="w-full bg-background border border-border px-4 py-3 rounded-xl outline-none focus:border-primary transition-colors" placeholder="40" />
                       </div>
                       <div className="flex-1">
                          <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Qty Received</label>
                          <input type="number" min="1" value={newProduct.stock_quantity || ''} onChange={e => { const val = parseInt(e.target.value) || 1; setNewProduct(prev => ({...prev, stock_quantity: val})); }} className="w-full bg-background border border-border px-4 py-3 rounded-xl outline-none focus:border-primary transition-colors" placeholder="10" />
                       </div>
                     </div>
                     <button onClick={submitNewProduct} className="w-full py-3.5 bg-primary text-primary-foreground font-bold rounded-xl mt-4 hover:shadow-lg hover:shadow-primary/20 transition-all flex justify-center items-center">
                        <CheckCircle className="w-5 h-5 mr-2" /> Save & Receive Goods
                     </button>
                  </div>
              </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
