import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "model";
  content: string;
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", content: "Hello! I'm your PayClick Focus assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    const updatedMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          history: messages
        })
      });

      const data = await res.json();
      const replyText = data.text || "I'm here to help with your VTU top-ups!";
      setMessages([...updatedMessages, { role: "model", content: replyText }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: "model", content: "Sorry, I encountered an error. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-20 right-4 w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg shadow-purple-500/25 flex items-center justify-center hover:bg-purple-700 transition-all z-40",
          isOpen && "scale-0 opacity-0"
        )}
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      <div
        className={cn(
          "fixed inset-0 sm:inset-auto sm:bottom-20 sm:right-4 sm:w-96 sm:h-[600px] bg-white dark:bg-gray-900 sm:rounded-2xl shadow-2xl flex flex-col transition-all duration-300 z-50 overflow-hidden border border-gray-200 dark:border-gray-800",
          isOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="bg-purple-600 p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6" />
            <div>
              <h3 className="font-bold text-sm">PayClick Assistant</h3>
              <p className="text-xs text-purple-200">Online</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-purple-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-950">
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={cn(
                "flex gap-2 max-w-[85%]",
                msg.role === "user" ? "ml-auto flex-row-reverse" : ""
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                msg.role === "user" ? "bg-purple-100 text-purple-600 dark:bg-purple-900/60 dark:text-purple-300" : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300"
              )}>
                {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={cn(
                "p-3 rounded-2xl text-sm",
                msg.role === "user" 
                  ? "bg-purple-600 text-white rounded-tr-sm" 
                  : "bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-800 rounded-tl-sm shadow-sm"
              )}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-tl-sm shadow-sm flex gap-1 items-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full p-1 pr-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:bg-gray-400 transition-colors shadow-sm shadow-purple-500/20"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
