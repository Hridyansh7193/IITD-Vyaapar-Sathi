"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  LayoutDashboard,
  BarChart3,
  Lightbulb,
  TrendingUp,
  Receipt,
  FileText,
  Settings,
  MessageSquare,
  Bell,
  UploadCloud,
  Zap,
  ScanLine,
  Package,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Package, label: "My Inventory", href: "/inventory" },
  { icon: BarChart3, label: "Sales Analytics", href: "/analytics" },
  { icon: UploadCloud, label: "Upload Data", href: "/upload" },
  { icon: Lightbulb, label: "AI Insights", href: "/insights" },
  { icon: TrendingUp, label: "Forecast", href: "/forecast" },
  { icon: Receipt, label: "GST", href: "/gst" },
  { icon: FileText, label: "Reports", href: "/reports" },
  { icon: MessageSquare, label: "AI Assistant", href: "/assistant" },
];

const bottomItems = [
  { icon: Bell, label: "Notifications", href: "/notifications" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card/60 backdrop-blur-md transition-all">
      <div className="flex h-full flex-col overflow-y-auto px-4 py-6">
        <Link href="/dashboard" className="mb-10 flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Zap className="w-6 h-6 text-primary-foreground fill-current" />
          </div>
          <span className="text-xl font-black bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">VyaaparMitra</span>
        </Link>

        <div className="space-y-1">
          <p className="px-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">Main Menu</p>
          <ul className="space-y-1.5 font-bold">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                    pathname === item.href
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className={cn(
                    "h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110",
                    pathname === item.href ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                  )} />
                  <span className="ml-3 tracking-tight">{item.label}</span>
                  {pathname === item.href && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto space-y-1 pt-6">
          <p className="px-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">System</p>
          <ul className="space-y-1.5 font-bold border-t border-border/50 pt-4">
            {bottomItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center rounded-xl px-3 py-2.5 text-sm transition-all",
                    pathname === item.href
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110" />
                  <span className="ml-3 tracking-tight">{item.label}</span>
                </Link>
              </li>
            ))}
            <li>
              <button
                onClick={handleSignOut}
                className="w-full group flex items-center rounded-xl px-3 py-2.5 text-sm transition-all text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
              >
                <LogOut className="h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110" />
                <span className="ml-3 tracking-tight">Sign Out</span>
              </button>
            </li>
          </ul>

          <div className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/10">
            <p className="text-xs font-black text-primary mb-1">PRO PLAN</p>
            <p className="text-[10px] text-muted-foreground font-medium mb-3">Get advanced AI insights & unlimited exports.</p>
            <button className="w-full py-2 bg-primary/20 hover:bg-primary/30 text-primary text-[10px] font-black rounded-lg transition-colors uppercase tracking-widest">Upgrade Now</button>
          </div>
        </div>
      </div>
    </aside>
  );
}
