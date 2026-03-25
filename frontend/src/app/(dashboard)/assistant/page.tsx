"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Loader2, Sparkles, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

export default function AssistantPage() {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<any[]>([
    { role: "assistant", content: "Hello! I am your AI Business Desk. Upload your sales data and ask me to analyze revenue trends or top products." }
  ]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const userQuery = input.trim();
    setInput("");
    setIsSending(true);

    try {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: userQuery }
      ]);

      const res = await fetch("http://localhost:8000/chat-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: userQuery,
          user_id: userId || "anonymous" 
        }),
      });

      if (!res.ok) throw new Error("Failed to send message");
      
      const data = await res.json();
      const assistantContent = data.response || "No response generated.";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: assistantContent }
      ]);

    } catch (err) {
      console.error(err);
      toast.error("Failed to connect to AI. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">AI Business Assistant</h2>
        <p className="text-muted-foreground mt-2">Chat with our AI to get instant answers about your business data.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex-1 bg-card border border-border rounded-xl shadow-sm flex flex-col overflow-hidden relative"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex-1 overflow-y-auto p-4 space-y-4 z-10 scroll-smooth" ref={scrollRef}>
          {messages.length === 0 && !isSending && (
             <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                <MessageSquare className="w-12 h-12 mb-4" />
                <p className="text-lg font-medium">No messages yet</p>
                <p className="text-sm">Ask anything about your sales, revenue, or products.</p>
             </div>
          )}
          {messages.map((message: any, index: number) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex w-full gap-3",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-none"
                    : "bg-card border border-border rounded-tl-none"
                )}
              >
                {message.content}
              </div>
              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-foreground" />
                </div>
              )}
            </motion.div>
          ))}
          {isSending && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 animate-pulse">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-none px-4 py-4 flex items-center">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {messages.length < 2 && !isSending && (
          <div className="p-4 flex flex-wrap gap-2 z-10 border-t border-border/50 bg-background/50">
            <button onClick={() => setInput("What is my best selling product?")} className="px-3 py-1.5 bg-card border border-border hover:bg-muted text-xs font-medium rounded-full transition-colors">
              What is my best selling product?
            </button>
            <button onClick={() => setInput("How were my sales this month?")} className="px-3 py-1.5 bg-card border border-border hover:bg-muted text-xs font-medium rounded-full transition-colors">
              How were my sales this month?
            </button>
            <button onClick={() => setInput("What should I promote this week?")} className="px-3 py-1.5 bg-card border border-border hover:bg-muted text-xs font-medium rounded-full transition-colors">
              What should I promote this week?
            </button>
          </div>
        )}

        <div className="p-4 bg-card border-t border-border z-10">
          <form className="relative flex items-center" onSubmit={handleSend}>
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your sales data..." 
              className="w-full bg-background border border-border rounded-xl pl-4 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all"
            />
            <button 
              type="submit"
              disabled={!input.trim() || isSending}
              className="absolute right-2 p-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
