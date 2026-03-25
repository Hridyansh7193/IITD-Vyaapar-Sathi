"use client";

import { motion } from "framer-motion";
import { Bell, AlertTriangle, CheckCircle, Package, Loader2 } from "lucide-react";
import { cn, getApiUrl } from "@/lib/utils";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

const fallbackNotifications = [
  { id: 1, type: "success", title: "Dataset Processed", message: "Your sales data for August has been successfully processed. New insights are available.", time: "10 mins ago", read: false, icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
  { id: 2, type: "warning", title: "Low Inventory Alert", message: "Ergonomic Office Chair V2 is running low on stock (Only 12 left).", time: "2 hours ago", read: false, icon: Package, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  { id: 3, type: "alert", title: "Sales Dropping", message: "Sales for Summer Apparel have dropped by 15% this week.", time: "1 day ago", read: true, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
  { id: 4, type: "info", title: "New Feature Available", message: "You can now export your GST summary directly to PDF format.", time: "2 days ago", read: true, icon: Bell, color: "text-primary", bg: "bg-primary/10" },
];

export default function NotificationsPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const { data, isLoading } = useSWR(
    userId ? `${getApiUrl()}/analytics?user_id=${userId}` : null,
    fetcher
  );

  const dynamicNotifications = data?.recommendations?.map((rec: any, index: number) => {
    let icon = Bell;
    let color = "text-primary";
    let bg = "bg-primary/10";
    
    if (rec.type === 'positive') {
      icon = CheckCircle; color = "text-success"; bg = "bg-success/10";
    } else if (rec.type === 'warning') {
      icon = AlertTriangle; color = "text-red-500"; bg = "bg-red-500/10";
    }

    return {
      id: index,
      type: rec.type,
      title: rec.title,
      message: rec.description,
      time: "Just now",
      read: false,
      icon, color, bg
    };
  }) || [];

  const notifications = dynamicNotifications.length > 0 ? dynamicNotifications : fallbackNotifications;

  return (
    <div className="max-w-4xl mx-auto space-y-6 mb-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Notifications</h2>
          <p className="text-muted-foreground mt-2">Updates, alerts, and insights about your business.</p>
        </div>
        <button className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
          Mark all as read
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="h-[400px] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification: any, index: number) => (
              <motion.div 
                key={notification.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn("p-6 flex items-start sm:items-center space-x-4 hover:bg-muted/50 transition-colors", !notification.read && "bg-muted/20")}
              >
                <div className={cn("p-3 rounded-lg flex-shrink-0 mt-1 sm:mt-0", notification.bg)}>
                  <notification.icon className={cn("w-6 h-6", notification.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1">
                    <h3 className={cn("text-base font-semibold truncate", !notification.read ? "text-foreground" : "text-foreground/80")}>
                      {notification.title}
                    </h3>
                    <span className="text-xs text-muted-foreground whitespace-nowrap mt-1 sm:mt-0">
                      {notification.time}
                    </span>
                  </div>
                  <p className={cn("text-sm", !notification.read ? "text-foreground/90 font-medium" : "text-muted-foreground")}>
                    {notification.message}
                  </p>
                </div>
                {!notification.read && (
                  <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-2 sm:mt-0" />
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
