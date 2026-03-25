"use client";

import { motion } from "framer-motion";
import {
  Download,
  FileBarChart,
  Filter,
  Loader2,
  FileText,
  TrendingUp,
  Package,
  ReceiptText,
  BarChart2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

const REPORT_TYPES = [
  {
    id: "Sales",
    name: "Sales Summary Report",
    description: "Complete overview of all sales transactions, revenue breakdown and top products.",
    icon: TrendingUp,
    color: "bg-indigo-500/10 text-indigo-400",
    accent: "border-indigo-500/20",
  },
  {
    id: "Tax",
    name: "GST Tax Report",
    description: "Detailed GST breakdown by category including CGST, SGST estimates.",
    icon: ReceiptText,
    color: "bg-purple-500/10 text-purple-400",
    accent: "border-purple-500/20",
  },
  {
    id: "Inventory",
    name: "Inventory Performance",
    description: "Stock movement analysis: top-selling and slow-moving product insights.",
    icon: Package,
    color: "bg-violet-500/10 text-violet-400",
    accent: "border-violet-500/20",
  },
  {
    id: "Analytics",
    name: "Analytics Export",
    description: "Full analytics dataset including trends, comparisons and forecasts.",
    icon: BarChart2,
    color: "bg-fuchsia-500/10 text-fuchsia-400",
    accent: "border-fuchsia-500/20",
  },
];

export default function ReportsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("All");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const { data, isLoading, mutate } = useSWR(
    userId ? `http://localhost:8000/analytics?user_id=${userId}` : null,
    fetcher
  );

  const stats = data?.stats;

  const handleDownload = async (reportType: string, format: "csv" | "pdf") => {
    if (!userId) {
      toast.error("Please log in to generate reports.");
      return;
    }
    if (!data) {
      toast.error("Please upload a CSV file first to generate reports.");
      return;
    }

    const key = `${reportType}-${format}`;
    setDownloading(key);
    try {
      const url = `http://localhost:8000/reports/generate?user_id=${userId}&report_type=${reportType}&format=${format}`;
      const response = await fetch(url);

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(err.detail || "Failed to generate report");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `VyaaparMitra_${reportType}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      toast.success(`${reportType} report downloaded as ${format.toUpperCase()}!`);
    } catch (err: any) {
      toast.error(err.message || "Download failed. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  const filteredReports =
    filterType === "All"
      ? REPORT_TYPES
      : REPORT_TYPES.filter((r) => r.id === filterType);

  return (
    <div className="space-y-8 mb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports & Exports</h2>
          <p className="text-muted-foreground mt-1">
            Generate and download detailed business reports from your real sales data.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => mutate()}
            className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-card hover:bg-muted text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="flex items-center px-3 py-2 border border-border rounded-lg bg-card hover:bg-muted text-sm font-medium transition-colors outline-none"
          >
            <option value="All">All Reports</option>
            {REPORT_TYPES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Status Banner */}
      {isLoading ? (
        <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading your data...</span>
        </div>
      ) : !data?.stats ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 p-5 bg-yellow-500/5 border border-yellow-500/20 rounded-xl"
        >
          <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-yellow-300">No data uploaded yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Go to{" "}
              <a href="/upload" className="text-primary underline">
                Data Integration
              </a>{" "}
              and upload a CSV file to generate real reports.
            </p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {[
            { label: "Total Revenue", value: stats.total_revenue },
            { label: "Total Orders", value: stats.total_orders },
            { label: "Net Profit", value: stats.net_profit },
            { label: "Avg Order Value", value: stats.avg_order_value },
          ].map((s, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-xl p-4 text-center"
            >
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{s.label}</p>
              <p className="text-lg font-bold text-foreground">{s.value || "—"}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredReports.map((report, index) => {
          const Icon = report.icon;
          const isDownloadingCSV = downloading === `${report.id}-csv`;
          const isDownloadingPDF = downloading === `${report.id}-pdf`;
          return (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className={`bg-card border ${report.accent} border rounded-xl p-6 flex flex-col gap-5 hover:shadow-lg transition-shadow`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${report.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{report.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{report.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <button
                  onClick={() => handleDownload(report.id, "csv")}
                  disabled={!!downloading || !data}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-muted hover:bg-muted/70 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isDownloadingCSV ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  CSV
                </button>
                <button
                  onClick={() => handleDownload(report.id, "pdf")}
                  disabled={!!downloading || !data}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold transition-colors shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isDownloadingPDF ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  PDF
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Recent History Table */}
      {data && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
        >
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <FileBarChart className="w-4 h-4 text-primary" />
              Top Product Snapshot
            </h3>
            <span className="text-xs text-muted-foreground">From your latest upload</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-muted-foreground uppercase bg-muted/30 border-b border-border font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Revenue</th>
                  <th className="px-6 py-3">Units Sold</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data?.top_products || []).slice(0, 6).map((product: any, i: number) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{product.product}</td>
                    <td className="px-6 py-4 text-success font-bold">{product.revenue}</td>
                    <td className="px-6 py-4 text-muted-foreground">{product.units.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDownload("Sales", "csv")}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 ml-auto"
                      >
                        <Download className="w-3 h-3" />
                        Export
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
