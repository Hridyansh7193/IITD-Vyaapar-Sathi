"use client";

import { Bell, Search, User, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/dashboard": "Market Overview",
  "/analytics": "Sales Intelligence",
  "/upload": "Data Ingestion",
  "/insights": "AI Business Insights",
  "/forecast": "Predictive Forecast",
  "/gst": "Tax Compliance",
  "/reports": "Executive Reports",
  "/assistant": "AI Business Assistant",
  "/performance": "Product Performance",
  "/notifications": "Alerts & Notifications",
  "/settings": "System Settings",
};

export function Navbar() {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "VyaaparMitra AI";
  
  return (
    <nav className="fixed top-0 z-30 w-full border-b border-border bg-background/60 backdrop-blur-xl transition-all">
      <div className="px-4 py-3 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-start lg:ml-64">
            <button className="lg:hidden p-2 mr-2 text-muted-foreground hover:bg-muted rounded-lg">
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-black tracking-tight text-foreground sm:text-2xl">{title}</h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden md:block">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  type="text"
                  className="block w-64 rounded-xl border border-border bg-card/40 py-2.5 pl-10 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                  placeholder="Global search..."
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="relative rounded-xl p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-95"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary border-2 border-background rounded-full" />
              </button>
              
              <div className="h-6 w-px bg-border/50 mx-1 hidden sm:block" />
              
              <button
                type="button"
                className="flex items-center gap-3 p-1 rounded-xl hover:bg-muted transition-all"
              >
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-tr from-primary to-secondary rounded-full opacity-0 group-hover:opacity-100 blur transition-all" />
                  <div className="relative h-9 w-9 rounded-full bg-muted border border-border/50 flex items-center justify-center overflow-hidden">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                <div className="hidden sm:block text-left mr-2">
                  <p className="text-xs font-black text-foreground leading-tight">Admin User</p>
                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Enterprise</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
