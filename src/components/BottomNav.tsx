import React from "react";
import { Home as HomeIcon, Clock, Activity, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const location = useLocation();

  const navItems = [
    { icon: HomeIcon, label: "Dashboard", path: "/" },
    { icon: Clock, label: "Transaction", path: "/history" },
    { icon: Activity, label: "Wallet History", path: "/history" },
    { icon: User, label: "Account", path: "/account" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-slate-100 dark:border-gray-800 pb-safe z-30 shadow-[0_-2px_10px_rgba(0,0,0,0.03)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.15)]">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.label === "Dashboard" && location.pathname === "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all relative active:scale-95",
                isActive
                  ? "text-[#8e24aa] dark:text-purple-400"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              )}
            >
              <Icon className="w-5.5 h-5.5 transition-transform" strokeWidth={isActive ? 2.2 : 1.8} />
              <span className={cn("text-[10px] font-bold tracking-tight", isActive ? "text-[#8e24aa] dark:text-purple-400" : "text-slate-400")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

