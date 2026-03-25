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
  const router = useRouter();

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.name.endsWith(".csv")) {
      setFile(droppedFile);
      setUploadStatus("idle");
      setPreviewData([]);
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

      const res = await fetch("http://localhost:8000/upload-sales", {
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
      toast.success("CSV Uploaded and Processed!");
      
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
          <h2 className="text-3xl font-bold tracking-tight">Data Integration</h2>
          <p className="text-muted-foreground mt-2">Connect your sales history to power the VyaaparMitra AI engine.</p>
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
            <h3 className="text-xl font-bold mb-2">Upload Sales Dataset</h3>
            <p className="text-muted-foreground mb-8 max-w-xs mx-auto">
              Drag your sales CSV here. Ensure it includes Date, Product, Category, Price, and Quantity.
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
                      <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB • Sales Dataset</p>
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
        </div>

        <div className="space-y-6">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
             <h4 className="font-bold mb-4 flex items-center">
               <AlertCircle className="w-4 h-4 mr-2 text-primary" />
               Upload Guidelines
             </h4>
             <ul className="space-y-3 text-sm text-foreground/80">
                <li className="flex items-start">
                  <div className="w-4 h-4 bg-primary/20 rounded text-[10px] flex items-center justify-center font-bold mr-2 mt-0.5">1</div>
                  Format must be .CSV
                </li>
                <li className="flex items-start">
                  <div className="w-4 h-4 bg-primary/20 rounded text-[10px] flex items-center justify-center font-bold mr-2 mt-0.5">2</div>
                  Columns: Date, Product, Category, Price, Quantity
                </li>
                <li className="flex items-start">
                  <div className="w-4 h-4 bg-primary/20 rounded text-[10px] flex items-center justify-center font-bold mr-2 mt-0.5">3</div>
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
