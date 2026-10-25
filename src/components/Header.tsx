import React, { useState, useEffect } from "react";
import { Bell, HelpCircle, Moon, Sun, Activity } from "lucide-react";
import { Logo } from "./Logo";
import { ApiDiagnosticsDashboard } from "./ApiDiagnosticsDashboard";

export function Header() {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("vtu_dark_mode") === "true";
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsDark(customEvent.detail.isDark);
    };
    window.addEventListener("vtu-theme-changed", handleThemeChange);
    return () => {
      window.removeEventListener("vtu-theme-changed", handleThemeChange);
    };
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    localStorage.setItem("vtu_dark_mode", String(nextDark));
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    window.dispatchEvent(new CustomEvent("vtu-theme-changed", { detail: { isDark: nextDark } }));
  };

  return (
    <>
      <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-slate-100 dark:border-gray-800 shadow-xs sticky top-0 z-10 transition-colors duration-200">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
        </div>
        <div className="flex items-center gap-3">
          {/* Quick API Handshake Diagnostics Trigger */}
          <button
            type="button"
            onClick={() => setShowDiagnostics(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800/40 text-xs font-black transition-all cursor-pointer"
            title="Open API Gateway Handshake & Diagnostics"
          >
            <Activity className="w-4 h-4 animate-pulse text-purple-600 dark:text-purple-400" />
            <span className="hidden sm:inline text-[11px] uppercase tracking-wider">API Health</span>
          </button>

          <button 
            type="button"
            onClick={toggleTheme} 
            className="text-gray-600 dark:text-gray-300 hover:text-purple-600 transition-colors p-1.5 rounded-lg cursor-pointer"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-purple-600" />}
          </button>
          <button className="text-gray-600 dark:text-gray-300 hover:text-purple-600 transition-colors relative p-1.5 cursor-pointer">
            <Bell className="w-5 h-5" />
            <span className="absolute 0.5 top-1 right-1 w-2 h-2 bg-purple-600 rounded-full animate-pulse"></span>
          </button>
        </div>
      </header>

      {/* Diagnostics Modal Popup */}
      {showDiagnostics && (
        <ApiDiagnosticsDashboard
          isOpen={showDiagnostics}
          onClose={() => setShowDiagnostics(false)}
          isModal={true}
        />
      )}
    </>
  );
}

