"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, AlertCircle, Eye, EyeOff, Check, Zap, ArrowRight, Shield, TrendingUp, Globe } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    // const name = formData.get("name") as string; // Optional metadata

    startTransition(async () => {
      try {
        const supabase = createClient();

        if (!isLogin) {
          // Sign Up
          const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
          });

          if (signUpError) {
            setError(signUpError.message);
            toast.error(signUpError.message);
            return;
          }
          toast.success("Account created! You are now logged in.");
        }

        // Sign In
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message);
          toast.error("Invalid email or password");
        } else {
          toast.success("Welcome to VyaaparMitra!");
          router.push("/dashboard");
          router.refresh();
        }
      } catch (err) {
        console.error(err);
        setError("Something went wrong. Please try again.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd] flex flex-col lg:flex-row overflow-hidden font-inter">
      {/* --- Left Side: Visual & Value Prop --- */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-center p-16 overflow-hidden">
        {/* Glow Decorators */}
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 space-y-8 max-w-xl">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
              <Zap className="w-7 h-7 text-primary-foreground fill-current text-white" />
            </div>
            <span className="text-3xl font-black bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">VyaaparMitra AI</span>
          </Link>

          <div className="space-y-4">
            <h1 className="text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent font-manrope">
              AI-Powered Growth Intelligence for <span className="text-primary italic">MSMEs</span>
            </h1>
            <p className="text-xl text-[#adb4ce] font-medium leading-relaxed">
              Empower your business with real-time insights, automated sales analytics, and intelligent forecasting. Built for the modern entrepreneur.
            </p>
          </div>

          {/* Feature Highlights with Tonal Density */}
          <div className="grid grid-cols-1 gap-4 pt-4">
            {[
              { icon: TrendingUp, title: "Precision Forecasting", desc: "Predict future demand with 95% accuracy.", color: "primary" },
              { icon: Shield, title: "Automated Compliance", desc: "GST summaries and tax insights made simple.", color: "emerald" },
              { icon: Globe, title: "Market Intelligence", desc: "Stay ahead of competitors with AI recommendations.", color: "indigo" }
            ].map((f, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-4 p-5 rounded-3xl bg-[#131b2e]/40 backdrop-blur-md border border-white/5 shadow-xl"
              >
                <div className={`p-3 rounded-2xl bg-${f.color}-500/10`}>
                  <f.icon className={`w-5 h-5 text-${f.color === 'emerald' ? 'emerald-400' : 'primary'}`} />
                </div>
                <div>
                  <h4 className="font-black text-sm">{f.title}</h4>
                  <p className="text-xs text-[#adb4ce] font-bold uppercase tracking-wider">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Floating Glassmorphism Data Visualization (Simulation) */}
        <div className="absolute -right-20 bottom-1/4 w-[450px] aspect-video bg-[#171f33]/60 backdrop-blur-2xl rounded-[3rem] border border-white/10 shadow-2xl p-8 rotate-[-6deg] hidden xl:block">
           <div className="flex justify-between items-end h-full gap-4 opacity-50">
              {[60, 40, 90, 70, 50, 80, 100].map((h, i) => (
                <div key={i} className="flex-1 bg-primary rounded-t-full transition-all duration-1000" style={{ height: `${h}%` }} />
              ))}
           </div>
           <div className="absolute inset-x-8 bottom-12 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground">Revenue Growth</p>
                <p className="text-2xl font-black text-white">+24.8%</p>
              </div>
              <div className="w-12 h-12 rounded-full border-2 border-primary/20 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-primary/20 blur-sm" />
              </div>
           </div>
        </div>
      </div>

      {/* --- Right Side: Form --- */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-[#060e20] relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg space-y-10 relative z-10"
        >
          <div className="text-center lg:text-left">
            <h2 className="text-4xl font-black tracking-tight font-manrope">
              {isLogin ? "Welcome back" : "Join the future"}
            </h2>
            <p className="text-lg text-[#adb4ce] font-medium mt-3">
              {isLogin ? "Sign in to access your business insights." : "Create your free account and start growing."}
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-300 text-sm font-bold"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1" htmlFor="name">Full Name</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required={!isLogin}
                    className="w-full bg-[#131b2e] border border-white/5 rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-primary/40 focus:border-primary/50 outline-none transition-all placeholder:text-[#464555]"
                    placeholder="Ramesh Sharma"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1" htmlFor="email">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full bg-[#131b2e] border border-white/5 rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-primary/40 focus:border-primary/50 outline-none transition-all placeholder:text-[#464555]"
                placeholder="you@company.com"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground" htmlFor="password">Password</label>
                {isLogin && <button type="button" className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest">Forgot?</button>}
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  className="w-full bg-[#131b2e] border border-white/5 rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-primary/40 focus:border-primary/50 outline-none transition-all placeholder:text-[#464555]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-[#adb4ce] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="flex items-center gap-2 ml-1">
                <input type="checkbox" id="remember" className="w-4 h-4 rounded-md bg-[#131b2e] border-white/10 text-primary focus:ring-primary" />
                <label htmlFor="remember" className="text-sm text-[#adb4ce] font-medium">Remember me for 30 days</label>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="flex items-center justify-center gap-3 w-full py-4.5 px-6 bg-primary hover:bg-[#4d44e3] text-white font-black rounded-3xl transition-all shadow-xl shadow-primary/20 active:scale-[0.98] disabled:opacity-60 mt-10"
            >
              {isPending ? (
                <><Loader2 className="w-5 h-5 animate-spin" />{isLogin ? "Connecting..." : "Onboarding..."}</>
              ) : (
                <>{isLogin ? "Sign In" : "Join VyaaparMitra"} <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </form>

          <div className="relative pt-6">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-xs font-black uppercase tracking-[0.2em]">
              <span className="bg-[#060e20] px-4 text-muted-foreground/60">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <button className="flex items-center justify-center gap-3 py-3.5 px-4 bg-[#131b2e] border border-white/5 hover:bg-[#171f33] rounded-2xl text-sm font-bold transition-all">
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center p-1 text-[8px] font-black text-black">G</div>
                Google
             </button>
             <button className="flex items-center justify-center gap-3 py-3.5 px-4 bg-[#131b2e] border border-white/5 hover:bg-[#171f33] rounded-2xl text-sm font-bold transition-all">
                <div className="w-5 h-5 bg-[#0077b5] rounded-[3px] flex items-center justify-center text-[10px] font-bold text-white italic">in</div>
                LinkedIn
             </button>
          </div>

          <div className="text-center pt-8">
            <p className="text-sm text-[#adb4ce] font-medium">
              {isLogin ? "New to the platform?" : "Already scaling with us?"}{" "}
              <button
                onClick={() => { setIsLogin(!isLogin); setError(null); }}
                className="text-primary font-black hover:underline"
              >
                {isLogin ? "Sign up for free" : "Log in to your account"}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
