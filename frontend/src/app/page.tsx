"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Lightbulb, Receipt } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Background Image with low opacity to make it look 'cool' without changing structure */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <Image
          src="/light_bg.png"
          alt="Clean Background"
          fill
          className="object-cover opacity-30"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/60 to-background" />
      </div>

      {/* Navigation */}
      <nav className="border-b border-border bg-card/40 backdrop-blur-md fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link href="/dashboard" className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent hover:opacity-80 transition-opacity">
              VyaaparMitra AI
            </Link>
          </div>
          <div className="hidden md:flex space-x-8">
            <Link href="#product" className="text-muted-foreground hover:text-foreground transition-colors">Product</Link>
            <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</Link>
            <Link href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            <Link href="#docs" className="text-muted-foreground hover:text-foreground transition-colors">Docs</Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login" className="text-foreground hover:text-primary transition-colors font-medium">Log in</Link>
            <Link href="/dashboard" className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-primary/20">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 pt-16 z-10">
        {/* Hero Section */}
        <section className="py-20 lg:py-32 overflow-hidden flex flex-col items-center text-center px-4 relative">
          <div className="absolute top-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent -z-10" />
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-5xl md:text-7xl font-bold tracking-tight max-w-4xl text-foreground"
          >
            AI-Powered Growth Intelligence for <span className="text-primary italic">MSMEs</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-6 text-xl text-muted-foreground max-w-2xl font-medium"
          >
            Upload your sales data and instantly receive actionable business analytics, AI marketing recommendations, demand forecasting, and GST summaries.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-10 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-20"
          >
            <Link href="/dashboard" className="px-10 py-4 bg-primary text-primary-foreground rounded-full font-bold text-lg hover:translate-y-[-2px] transition-all shadow-xl shadow-primary/30">
              Try Demo
            </Link>
            <Link href="/upload" className="px-10 py-4 bg-card border border-border text-foreground rounded-full font-bold text-lg hover:bg-muted transition-all">
              Upload Sales Data
            </Link>
          </motion.div>

          {/* Image Element in the Project - Dashboard/Business Visualization */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="relative w-full max-w-5xl aspect-[16/8] rounded-[2.5rem] border border-border overflow-hidden shadow-2xl bg-card"
          >
            <Image
              src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop"
              alt="Analytics Visualization"
              fill
              className="object-cover"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
          </motion.div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold tracking-tight">Enterprise Analytics for Everyone</h2>
              <p className="mt-4 text-lg text-muted-foreground font-medium">Everything you need to run your business effectively.</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { title: "Sales Analytics", desc: "Interactive dashboards to visualize your revenue and profitable items.", icon: BarChart3 },
                { title: "AI Recommendations", desc: "Smart marketing and inventory insights generated specifically for your business.", icon: Lightbulb },
                { title: "Demand Forecasting", desc: "Predict future sales trends using your historical sales datasets.", icon: TrendingUp },
                { title: "GST Insights", desc: "Automated tax breakdowns to simplify your regulatory compliance.", icon: Receipt },
              ].map((feature, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card/50 backdrop-blur-sm border border-border p-8 rounded-[2rem] hover:border-primary/40 transition-all hover:translate-y-[-4px]"
                >
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary shadow-inner">
                    <feature.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Dashboard Preview Section (kept original structure but updated look) */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="rounded-3xl border border-border bg-card/60 backdrop-blur-sm shadow-2xl overflow-hidden relative group"
            >
              <div className="h-12 border-b border-border bg-muted/40 flex items-center px-6 space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-400/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                <div className="w-3 h-3 rounded-full bg-green-400/80" />
              </div>
              <div className="aspect-video relative flex items-center justify-center p-8 overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1551288049-bbbda5366991?q=80&w=2670&auto=format&fit=crop"
                  alt="Dashboard Content"
                  fill
                  className="object-cover opacity-10 group-hover:opacity-20 transition-opacity duration-1000"
                  unoptimized
                />
                <div className="text-center relative z-10">
                  <BarChart3 className="w-20 h-20 text-primary/40 mx-auto mb-6" />
                  <p className="text-xl font-bold text-foreground">Log in to view intelligent dashboards</p>
                  <p className="text-muted-foreground mt-2">Tailored analytics waiting for your sales data</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 backdrop-blur-sm py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center text-center md:text-left">
          <div className="mb-8 md:mb-0">
            <span className="text-3xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              VyaaparMitra AI
            </span>
            <p className="mt-2 text-muted-foreground font-medium">Growth intelligence for the modern MSME.</p>
          </div>
          <div className="flex space-x-12 text-sm font-semibold text-muted-foreground">
             <Link href="/" className="hover:text-primary transition-colors">About</Link>
             <Link href="/" className="hover:text-primary transition-colors">Privacy</Link>
             <Link href="/" className="hover:text-primary transition-colors">Terms</Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-border/50 text-center text-xs text-muted-foreground/60 font-bold tracking-widest uppercase">
          © 2026 VyaaparMitra AI. Built for the future of Bharat.
        </div>
      </footer>
    </div>
  );
}
