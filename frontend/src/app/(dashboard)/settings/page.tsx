"use client";

import { motion } from "framer-motion";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-2">Manage your account preferences and business details.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold mb-1">Business Profile</h3>
          <p className="text-sm text-muted-foreground">Update your company details and GSTIN.</p>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Company Name</label>
              <input type="text" className="w-full bg-background border border-border rounded-lg px-4 py-2 focus:ring-primary focus:border-primary" defaultValue="Acme Electronics" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">GSTIN</label>
              <input type="text" className="w-full bg-background border border-border rounded-lg px-4 py-2 focus:ring-primary focus:border-primary" defaultValue="27AADCB2230M1Z2" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Business Email</label>
              <input type="email" className="w-full bg-background border border-border rounded-lg px-4 py-2 focus:ring-primary focus:border-primary" defaultValue="admin@acme.inc" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Contact Number</label>
              <input type="text" className="w-full bg-background border border-border rounded-lg px-4 py-2 focus:ring-primary focus:border-primary" defaultValue="+91 98765 43210" />
            </div>
          </div>
          
          <div className="pt-4 flex justify-end">
            <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
              Save Changes
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
