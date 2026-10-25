import React from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { ApiDiagnosticsDashboard } from "@/components/ApiDiagnosticsDashboard";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function DiagnosticsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 pb-20 transition-colors">
      <Header />
      
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <ApiDiagnosticsDashboard isOpen={true} isModal={false} />
      </div>

      <BottomNav />
    </div>
  );
}
