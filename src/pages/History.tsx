import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Calendar, Filter, Trash2, Smartphone, Tv, Zap, GraduationCap, RefreshCw, BarChart2, TrendingUp, Sparkles, FileDown } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";
import { saveUserFieldToCloud } from "@/lib/firebase";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart as ReBarChart, 
  Bar, 
  Cell 
} from "recharts";

interface LocalTransaction {
  id: string;
  serviceId: string;
  providerName: string;
  providerColor?: string;
  providerTextColor?: string;
  amount: number;
  date: string;
  phoneOrMeter?: string;
  status: string;
  details: string;
}

export function History() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<LocalTransaction[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("" );

  const email = localStorage.getItem("vtu_user_email") || "jamesg961@gmail.com";

  // Extended Advanced Filters state
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDatePreset, setFilterDatePreset] = useState<string>("all");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");
  const [showFilterPanel, setShowFilterPanel] = useState<boolean>(false);

  const loadTransactions = () => {
    const stored = localStorage.getItem("vtu_transactions");
    if (stored) {
      try {
        setTransactions(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse local stored transactions list", e);
      }
    } else {
      // Empty by default as requested to remove all dummy/seed datas
      const seeds: LocalTransaction[] = [];
      localStorage.setItem("vtu_transactions", JSON.stringify(seeds));
      setTransactions(seeds);
      saveUserFieldToCloud(email, "transactions", seeds);
    }
  };

  useEffect(() => {
    loadTransactions();

    // Listen to background transaction processing completions to update the view instantly
    window.addEventListener("vtu-transactions-updated", loadTransactions);
    return () => {
      window.removeEventListener("vtu-transactions-updated", loadTransactions);
    };
  }, []);

  const clearHistory = () => {
    if (window.confirm("Are you sure you want to clear your local transactions list?")) {
      localStorage.removeItem("vtu_transactions");
      setTransactions([]);
      saveUserFieldToCloud(email, "transactions", []);
    }
  };

  const handleDownloadReceipt = (tx: LocalTransaction) => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a6"
      });

      // Colors
      const payClickPurple = [126, 34, 206];
      const darkSlate = [15, 23, 42];

      // Top banner
      doc.setFillColor(payClickPurple[0], payClickPurple[1], payClickPurple[2]);
      doc.rect(0, 0, 105, 18, "F");

      // Header Brand
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("PayClick Focus VTU", 52.5, 7.5, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text("OFFICIAL TRANSACTION RECEIPT", 52.5, 12, { align: "center" });

      // Amount Title
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text(`-NGN ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 52.5, 28, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("TRANSACTION VALUE", 52.5, 33, { align: "center" });

      // Line separator
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(10, 38, 95, 38);

      // Key details
      const labelX = 12;
      const valX = 93;
      let yItem = 46;

      const addFieldRow = (label: string, valueStr: string) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(label, labelX, yItem);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(valueStr, valX, yItem, { align: "right" });
        yItem += 7.5;
      };

      addFieldRow("Transaction Reference", tx.id);
      addFieldRow("Service Category", (tx.serviceId || "vtu").toUpperCase());
      addFieldRow("Provider Operator", tx.providerName);
      addFieldRow("Beneficiary Target", tx.phoneOrMeter || "N/A");
      addFieldRow("Transaction Timestamp", tx.date);
      addFieldRow("Operating Status", tx.status.toUpperCase());
      addFieldRow("Settlement Source", "PayClick Wallet Funds");

      // Line separator
      doc.line(10, yItem - 2, 95, yItem - 2);

      // Official Badge Area
      doc.setDrawColor(payClickPurple[0], payClickPurple[1], payClickPurple[2]);
      doc.setFillColor(250, 245, 255);
      doc.rect(20, yItem + 1, 65, 10, "FD");

      doc.setTextColor(payClickPurple[0], payClickPurple[1], payClickPurple[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("✓ PAYCLICK SECURE TRANSACTION", 52.5, yItem + 5, { align: "center" });
      doc.setFontSize(5.5);
      doc.text("DIGITAL ID SECURED BY VTU NETWORKS", 52.5, yItem + 8.5, { align: "center" });

      // Fine print footer
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(148, 163, 184);
      doc.text("This document constitutes formal receipt of digital asset settlement.", 52.5, 138, { align: "center" });
      doc.text("For questions or complaints, write support@payclick.com.", 52.5, 141, { align: "center" });

      doc.save(`PayClick-Receipt-${tx.id}.pdf`);
    } catch (err) {
      console.error("PDF generator failure:", err);
    }
  };

  const getServiceIcon = (serviceId: string) => {
    switch (serviceId) {
      case "airtime":
        return <Smartphone className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      case "data":
        return (
          <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case "electricity":
        return <Zap className="w-5 h-5 text-amber-500" />;
      case "cables":
        return <Tv className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      case "exams":
        return <GraduationCap className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      default:
        return <RefreshCw className="w-5 h-5 text-slate-500" />;
    }
  };

  const parseTxDate = (dateStr?: string): Date => {
    try {
      if (!dateStr) return new Date();
      if (dateStr.includes("2026") || dateStr.includes("2025") || dateStr.includes("2024")) {
        return new Date(dateStr);
      }
      const currentYear = new Date().getFullYear();
      return new Date(`${dateStr}, ${currentYear}`);
    } catch (e) {
      return new Date();
    }
  };

  const filtered = transactions.filter((tx) => {
    if (!tx) return false;
    // 1. Service Type filter
    const matchesFilter = filterType === "all" || tx.serviceId === filterType;
    
    // 2. Search query matching
    const q = (searchQuery || "").trim().toLowerCase();
    const provider = String(tx.providerName || "").toLowerCase();
    const details = String(tx.details || "").toLowerCase();
    const phoneOrMeter = String(tx.phoneOrMeter || "").toLowerCase();
    const id = String(tx.id || "").toLowerCase();
    const reference = String((tx as any)?.reference || "").toLowerCase();
    const description = String((tx as any)?.description || "").toLowerCase();

    const matchesSearch = !q || (
      provider.includes(q) ||
      details.includes(q) ||
      phoneOrMeter.includes(q) ||
      id.includes(q) ||
      reference.includes(q) ||
      description.includes(q)
    );

    // 3. Status filter matches
    const txStatus = String(tx.status || "successful").toLowerCase();
    const matchesStatus = !filterStatus || filterStatus === "all" || txStatus === String(filterStatus).toLowerCase();

    // 4. Date filter matches
    let matchesDate = true;
    const txDate = parseTxDate(tx.date);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    if (filterDatePreset === "today") {
      matchesDate = txDate >= startOfToday;
    } else if (filterDatePreset === "yesterday") {
      const endOfYesterday = new Date(startOfToday);
      matchesDate = txDate >= startOfYesterday && txDate < endOfYesterday;
    } else if (filterDatePreset === "week") {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - 7);
      startOfWeek.setHours(0, 0, 0, 0);
      matchesDate = txDate >= startOfWeek;
    } else if (filterDatePreset === "month") {
      const startOfMonth = new Date();
      startOfMonth.setDate(startOfMonth.getDate() - 30);
      startOfMonth.setHours(0, 0, 0, 0);
      matchesDate = txDate >= startOfMonth;
    } else if (filterDatePreset === "custom") {
      if (filterStartDate) {
        const startBound = new Date(filterStartDate);
        startBound.setHours(0, 0, 0, 0);
        matchesDate = matchesDate && txDate >= startBound;
      }
      if (filterEndDate) {
        const endBound = new Date(filterEndDate);
        endBound.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && txDate <= endBound;
      }
    }

    return matchesFilter && matchesSearch && matchesStatus && matchesDate;
  });

  const [activeChartTab, setActiveChartTab] = useState<"category" | "trend">("category");

  // Spending aggregated by Category for the Recharts Bar chart
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {
      airtime: 0,
      data: 0,
      electricity: 0,
      cables: 0,
      exams: 0,
    };
    transactions.forEach(t => {
      const cat = t.serviceId || "airtime";
      if (map[cat] !== undefined) {
        map[cat] += t.amount;
      } else {
        map[cat] = t.amount;
      }
    });

    return [
      { name: "Airtime", Amount: map.airtime, color: "#9333ea" },
      { name: "Data", Amount: map.data, color: "#10B981" },
      { name: "Electricity", Amount: map.electricity, color: "#F59E0B" },
      { name: "TV Cables", Amount: map.cables, color: "#7c3aed" },
      { name: "Exams", Amount: map.exams, color: "#a855f7" },
    ];
  }, [transactions]);

  // Total amount spent
  const totalSpent = useMemo(() => {
    return transactions.reduce((acc, t) => acc + t.amount, 0);
  }, [transactions]);

  // Spending aggregated by chronological transactions for Trend Area Chart
  const trendData = useMemo(() => {
    const rawData = [...transactions].reverse(); // oldest first
    if (rawData.length === 0) {
      return [
        { date: "Day 1", Amount: 0 },
        { date: "Day 10", Amount: 0 },
        { date: "Day 20", Amount: 0 },
        { date: "Day 30", Amount: 0 }
      ];
    }
    return rawData.map(t => {
      const label = t.date.split(",")[0] || t.date;
      return {
        date: label.trim(),
        Amount: t.amount,
      };
    });
  }, [transactions]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 pb-24 text-gray-800 dark:text-gray-100 transition-colors duration-200">
      {/* HEADER */}
      <header className="bg-white dark:bg-gray-900 border-b border-slate-100 dark:border-gray-850 shadow-sm sticky top-0 z-20 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate("/")}
            className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Transaction History</h1>
        </div>

        {transactions.length > 0 && (
          <button 
            onClick={clearHistory}
            className="text-red-500 hover:text-red-600 flex items-center gap-1 text-xs font-bold bg-rose-50 dark:bg-rose-950/30 px-2.5 py-1.5 rounded-lg transition-colors active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </header>

      {/* 2. RECHARTS SPENDING HABITS VISUALIZER */}
      <div className="p-4 max-w-md mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4.5 border border-slate-100 dark:border-gray-850 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">30 Days Spent Summary</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                ₦{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/50 dark:border-gray-700">
              <button
                onClick={() => setActiveChartTab("category")}
                className={cn(
                  "p-2 rounded-lg transition-colors flex items-center justify-center",
                  activeChartTab === "category"
                    ? "bg-white dark:bg-gray-900 shadow-xs text-purple-600 dark:text-purple-400"
                    : "text-slate-400 hover:text-slate-600"
                )}
                title="Category Breakdown"
              >
                <BarChart2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveChartTab("trend")}
                className={cn(
                  "p-2 rounded-lg transition-colors flex items-center justify-center",
                  activeChartTab === "trend"
                    ? "bg-white dark:bg-gray-900 shadow-xs text-purple-600 dark:text-purple-400"
                    : "text-slate-400 hover:text-slate-600"
                )}
                title="Chronological Trend"
              >
                <TrendingUp className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="relative w-full h-[180px] bg-slate-50/50 dark:bg-slate-950/20 rounded-xl p-1.5 flex items-center justify-center">
            {transactions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center">No transaction data available yet</p>
            ) : activeChartTab === "category" ? (
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: "bold" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: "#94a3b8", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{ fill: "rgba(147, 51, 234, 0.08)" }}
                    contentStyle={{ 
                      backgroundColor: "rgba(15, 23, 42, 0.95)", 
                      borderRadius: "12px", 
                      border: "none", 
                      fontSize: "11px",
                      color: "#fff"
                    }}
                    formatter={(value: any) => [`₦${Number(value).toLocaleString()}`, "Spent"]}
                  />
                  <Bar dataKey="Amount" radius={[6, 6, 0, 0]}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </ReBarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: "bold" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: "#94a3b8", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "rgba(15, 23, 42, 0.95)", 
                      borderRadius: "12px", 
                      border: "none", 
                      fontSize: "11.5px",
                      color: "#fff"
                    }}
                    formatter={(value: any) => [`₦${Number(value).toLocaleString()}`, "Amount"]}
                  />
                  <defs>
                    <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9333ea" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#9333ea" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="Amount" 
                    stroke="#9333ea" 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#colorSpent)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="p-4 max-w-md mx-auto space-y-3.5">
        
        {/* Search Input & Advanced Filters Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="w-4.5 h-4.5 text-slate-400" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search operator, target, ID..."
              className="w-full pl-9 pr-4 py-3 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all text-slate-800 dark:text-white"
            />
          </div>
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={cn(
              "p-3 rounded-xl border transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95 text-xs font-bold shrink-0",
              showFilterPanel || filterStatus !== "all" || filterDatePreset !== "all"
                ? "bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/50"
                : "bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-800 text-slate-600 dark:text-slate-300"
            )}
            title="Toggle Advanced Filters"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {(filterStatus !== "all" || filterDatePreset !== "all") && (
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
            )}
          </button>
        </div>

        {/* Dynamic Expandable Advanced Filters Box */}
        {showFilterPanel && (
          <div className="bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-2xl p-4.5 shadow-md space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-gray-805">
              <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                Filter Configurations
              </h4>
              <button
                onClick={() => {
                  setFilterStatus("all");
                  setFilterDatePreset("all");
                  setFilterStartDate("");
                  setFilterEndDate("");
                }}
                className="text-[10px] font-black text-rose-500 hover:text-rose-600 uppercase border-b border-transparent hover:border-rose-500"
              >
                Clear All
              </button>
            </div>

            {/* Transaction Status Filter */}
            <div className="space-y-1.5">
              <label className="block text-[9.5px] uppercase font-bold text-slate-400">Execution Status</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { value: "all", label: "All" },
                  { value: "Successful", label: "Success" },
                  { value: "Pending", label: "Pending" },
                  { value: "Failed", label: "Failed" }
                ].map((st) => (
                  <button
                    key={st.value}
                    type="button"
                    onClick={() => setFilterStatus(st.value)}
                    className={cn(
                      "py-1.5 rounded-lg text-xs font-bold transition-all border outline-none",
                      filterStatus === st.value
                        ? "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800"
                        : "bg-slate-50 dark:bg-slate-950/20 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-gray-800/80"
                    )}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Preset Filter */}
            <div className="space-y-1.5">
              <label className="block text-[9.5px] uppercase font-bold text-slate-400">Timeline Scope</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { value: "all", label: "Anytime" },
                  { value: "today", label: "Today" },
                  { value: "yesterday", label: "Yesterday" },
                  { value: "week", label: "Last 7 Days" },
                  { value: "month", label: "Last 30 Days" },
                  { value: "custom", label: "Custom Range" }
                ].map((pr) => (
                  <button
                    key={pr.value}
                    type="button"
                    onClick={() => setFilterDatePreset(pr.value)}
                    className={cn(
                      "py-1.5 rounded-lg text-[11px] font-bold transition-all border outline-none",
                      filterDatePreset === pr.value
                        ? "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800"
                        : "bg-slate-50 dark:bg-slate-950/20 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-gray-800/80"
                    )}
                  >
                    {pr.label}
                  </button>
                ))}
              </div>
            </div>

            {/* If Custom chosen, render Start/End pickers */}
            {filterDatePreset === "custom" && (
              <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-dashed border-slate-100 dark:border-gray-800">
                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-extrabold text-slate-400">From Date</label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-gray-800 rounded-xl px-2.5 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-extrabold text-slate-400">To Date</label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-gray-800 rounded-xl px-2.5 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filter Badges */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 -mx-4 px-4 scrollbar-none">
          {[
            { value: "all", label: "All Services" },
            { value: "airtime", label: "Airtime" },
            { value: "data", label: "Data plans" },
            { value: "electricity", label: "Electricity" },
            { value: "cables", label: "TV Cables" },
            { value: "exams", label: "Exams Pins" }
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilterType(tab.value)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors",
                filterType === tab.value
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-white dark:bg-gray-900 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-gray-800 hover:bg-slate-100"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TRANSACTION LIST CONTAINER */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl py-12 px-6 text-center border border-slate-100 dark:border-gray-800">
              <div className="w-16 h-16 rounded-full bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center mx-auto mb-3.5 text-purple-400">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-1">No Transactions Found</h3>
              <p className="text-xs text-slate-400">
                {searchQuery || filterType !== "all" 
                  ? "Try updating your query or category filters" 
                  : "Make your first sub purchase to populate history!"}
              </p>
            </div>
          ) : (
            filtered.map((tx, idx) => (
              <div 
                key={tx.id || `tx-${idx}`}
                className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-xs border border-purple-100/60 dark:border-purple-900/30 flex items-center justify-between transition-all hover:border-purple-200 dark:hover:border-purple-700 hover:shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center border border-purple-100/50 dark:border-purple-800/30 text-purple-600 dark:text-purple-400">
                    {getServiceIcon(tx.serviceId || "airtime")}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn(
                        "text-[10px] font-black px-1.5 py-0.5 rounded border leading-none uppercase tracking-wider",
                        tx.providerColor || "bg-purple-600",
                        tx.providerTextColor || "text-white"
                      )}>
                        {tx.providerName || "PayClick"}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 font-mono">
                        {tx.id || "TXN"}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1 leading-tight">
                      {tx.details || "Digital Asset Settlement"}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
                      <span>Target: {tx.phoneOrMeter || "Self"}</span>
                      <span className="text-slate-300">•</span>
                      <span>{tx.date || "Recent"}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end justify-between self-stretch py-0.5">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-black text-slate-900 dark:text-white whitespace-nowrap">
                      -₦{(Number(tx.amount) || 0).toLocaleString()}
                    </span>
                    <span className="inline-block bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 text-[9.5px] font-black px-2 py-0.5 rounded-full uppercase scale-90 mt-1">
                      {tx.status || "Completed"}
                    </span>
                  </div>

                  <button 
                    onClick={() => handleDownloadReceipt(tx)}
                    title="Download PDF Receipt"
                    className="flex items-center gap-1 mt-1 text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 px-2 py-1 rounded-lg transition-colors border border-transparent hover:border-purple-100/30 text-[10px] font-extrabold focus:outline-none cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-500" />
                    <span>Receipt</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      <BottomNav />
    </div>
  );
}
