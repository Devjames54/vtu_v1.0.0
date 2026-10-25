import React from "react";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusType = "idle" | "loading" | "success" | "error";

interface StatusBadgeProps {
  status: StatusType;
  message?: string;
  loadingMessage?: string;
  successMessage?: string;
  errorMessage?: string;
  className?: string;
}

export function StatusBadge({
  status,
  message,
  loadingMessage = "Processing transaction with ClubKonnect...",
  successMessage = "Success! Transaction completed successfully.",
  errorMessage = "Transaction failed. Please check your network and balance.",
  className
}: StatusBadgeProps) {
  if (status === "idle") return null;

  const config = {
    loading: {
      bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300",
      icon: <Loader2 className="w-4 h-4 animate-spin text-amber-500" />,
      text: message || loadingMessage,
    },
    success: {
      bg: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/40 text-purple-800 dark:text-purple-300",
      icon: <CheckCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
      text: message || successMessage,
    },
    error: {
      bg: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300",
      icon: <AlertCircle className="w-4 h-4 text-rose-500" />,
      text: message || errorMessage,
    }
  };

  const active = config[status as Exclude<StatusType, "idle">];
  if (!active) return null;

  return (
    <div className={cn(
      "flex items-center gap-2.5 px-4 py-3.5 border rounded-xl text-xs font-bold transition-all shadow-xs animate-in fade-in slide-in-from-top-1.5 duration-200",
      active.bg,
      className
    )}>
      {active.icon}
      <span className="flex-1">{active.text}</span>
    </div>
  );
}
