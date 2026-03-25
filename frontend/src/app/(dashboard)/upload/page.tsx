"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, File, CheckCircle, AlertCircle, Loader2, Table as TableIcon, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [failedItems, setFailedItems] = useState<string[]>([]);
  const [uploadMode, setUploadMode] = useState<"receive" | "checkout">("receive");
  const router = useRouter();

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.name.endsWith(".csv")) {
      setFile(droppedFile);
      setUploadStatus("idle");
      setPreviewData([]);
      setFailedItems([]);
    } else {
      toast.error("Please upload a CSV file");
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadStatus("idle");
      setUploadProgress(0);
      setPreviewData([]);
      setFailedItems([]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("No file selected");
      return;
    }
    
    setIsUploading(true);
    setUploadStatus("idle");
    setUploadProgress(10);
    
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
         toast.error("You must be logged in to upload sales data");
         setIsUploading(false);
         return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("user_id", user.id);

      // Simulate progress for UI feel
      const interval = setInterval(() => {
        setUploadProgress(p => (p < 90 ? p + 2 : p));
      }, 100);

      const res = await fetch(`http://localhost:8000/v2/upload/${uploadMode}`, {
        method: "POST",
        body: formData,
      });

      clearInterval(interval);
      setUploadProgress(100);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setUploadStatus("success");
      setPreviewData(data.preview || []);
      setFailedItems(data.failed_items || []);
      
      if (data.failed_items && data.failed_items.length > 0) {
        toast.warning(data.details || `Processed with some skips. Check details below.`);
      } else {
        toast.success(data.details || "CSV Uploaded and Processed!");
      }
      
      // Refresh dashboard background data
      router.refresh();
      
    } catch (err: any) {
      console.error(err);
      setUploadStatus("error");
      toast.error(err.message || "Failed to process CSV");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bulk Upload</h2>
          <p className="text-muted-foreground mt-2">Upload a CSV to quickly receive new stock or process bulk checkout sales using the Profit Engine.</p>
        </div>
        <div className="flex bg-muted p-1 rounded-xl shadow-inner shadow-black/5 dark:shadow-white/5">
          <button
            onClick={() => setUploadMode("receive")}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${
              uploadMode === "receive"
                ? "bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Receive Stock
          </button>
          <button
            onClick={() => setUploadMode("checkout")}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${
              uploadMode === "checkout"
                ? "bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Checkout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border-2 border-dashed border-border rounded-2xl p-12 flex flex-col items-center justify-center text-center hover:border-primary/50 transition-all group"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Upload {uploadMode === "receive" ? "Stock Receipt" : "Sales Transactions"} CSV</h3>
            <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
              Drag your {uploadMode === "receive" ? "inventory" : "sales"} CSV here. Ensure it includes at least a Product name and Quantity.
            </p>
            
            <input type="file" accept=".csv" className="hidden" id="fileInput" onChange={handleFileInput} />
            <label htmlFor="fileInput" className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-semibold cursor-pointer hover:shadow-lg hover:shadow-primary/20 transition-all">
              Choose File
            </label>
            <p className="text-xs text-muted-foreground mt-6 uppercase tracking-widest font-bold">Max File Size: 50MB</p>
          </motion.div>

          <AnimatePresence>
            {file && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <File className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-lg truncate max-w-md">{file.name}</p>
                      <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB • {uploadMode === "receive" ? "Stock Receipt" : "Sales Transactions"}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setFile(null); setUploadStatus("idle"); setPreviewData([]); }}
                    className="text-sm font-bold text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    Remove
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-semibold">{isUploading ? "Uploading & Analyzing..." : uploadStatus === "success" ? "Processing Complete" : "Ready to Process"}</span>
                    <span className="text-muted-foreground font-mono">{uploadProgress}%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-primary"
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ type: "spring", stiffness: 50 }}
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                   <button 
                    disabled={isUploading || uploadStatus === "success"}
                    onClick={handleUpload}
                    className="flex items-center px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:shadow-lg disabled:opacity-50 transition-all"
                   >
                     {isUploading ? (
                       <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                     ) : uploadStatus === "success" ? (
                       <CheckCircle className="w-5 h-5 mr-3" />
                     ) : (
                       <ArrowRight className="w-5 h-5 mr-3" />
                     )}
                     {isUploading ? "Processing..." : uploadStatus === "success" ? "Success" : "Start Analysis"}
                   </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {previewData.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-border bg-muted/50 flex items-center">
                <TableIcon className="w-4 h-4 mr-2 text-primary" />
                <span className="font-bold text-sm">Data Preview (First 10 Rows)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-muted-foreground font-bold uppercase tracking-wider bg-muted/20 border-b border-border">
                    <tr>
                      {Object.keys(previewData[0]).map(key => (
                        <th key={key} className="px-4 py-3">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, i) => (
                      <tr key={i} className="border-b border-border hover:bg-muted/10 transition-colors">
                        {Object.values(row).map((val: any, j) => (
                          <td key={j} className="px-4 py-3">{val}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {failedItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 rounded-2xl overflow-hidden mt-6"
            >
              <div className="p-4 border-b border-red-500/20 flex items-center bg-red-500/5">
                <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
                <span className="font-bold text-sm text-red-500">Skipped Checkout Items ({failedItems.length})</span>
              </div>
              <ul className="p-4 space-y-2 text-sm text-red-500 font-medium max-h-48 overflow-y-auto">
                {failedItems.map((msg, i) => (
                  <li key={i}>• {msg}</li>
                ))}
              </ul>
            </motion.div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
             <h4 className="font-bold mb-4 flex items-center">
               <AlertCircle className="w-4 h-4 mr-2 text-primary" />
               Upload Guidelines
             </h4>
             <ul className="space-y-3 text-sm text-foreground/80">
                {uploadMode === "receive" ? (
                  <li className="flex items-start">
                    <div className="w-4 h-4 bg-primary/20 rounded text-[10px] flex items-center justify-center font-bold mr-2 mt-0.5 flex-shrink-0">1</div>
                    <span><strong className="text-foreground">Required Columns:</strong> <br/>Date, Product, Quantity, CostPrice</span>
                  </li>
                ) : (
                  <li className="flex items-start">
                    <div className="w-4 h-4 bg-primary/20 rounded text-[10px] flex items-center justify-center font-bold mr-2 mt-0.5 flex-shrink-0">1</div>
                    <span><strong className="text-foreground">Required Columns:</strong> <br/>Date, Product, Quantity, Price</span>
                  </li>
                )}
                <li className="flex items-start">
                  <div className="w-4 h-4 bg-primary/20 rounded text-[10px] flex items-center justify-center font-bold mr-2 mt-0.5 flex-shrink-0">2</div>
                  <span><strong className="text-foreground">Optional Columns:</strong> <br/>Category</span>
                </li>
                <li className="flex items-start">
                  <div className="w-4 h-4 bg-primary/20 rounded text-[10px] flex items-center justify-center font-bold mr-2 mt-0.5 flex-shrink-0">3</div>
                  Max rows recommended: 50,000
                </li>
             </ul>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
             <h4 className="font-bold mb-4">Sample Template</h4>
             <p className="text-sm text-muted-foreground mb-4">Download our sample CSV file to ensure your data matches our AI's requirements.</p>
             <button className="w-full py-2.5 border border-border rounded-xl text-sm font-bold hover:bg-muted transition-all">
                Download Sample .CSV
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
