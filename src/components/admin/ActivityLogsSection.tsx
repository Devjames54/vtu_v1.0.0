import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Clock, 
  User, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  CreditCard, 
  Layers, 
  Settings, 
  Trash2, 
  Eye, 
  X,
  Calendar,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { AdminActivityLog } from "@/types/admin";
import { subscribeToAdminActivityLogs, getCachedAdminActivityLogs } from "@/lib/activityLogger";
import { cn } from "@/lib/utils";

interface ActivityLogsSectionProps {
  currentUserEmail: string;
}

export function ActivityLogsSection({ currentUserEmail }: ActivityLogsSectionProps) {
  const [logs, setLogs] = useState<AdminActivityLog[]>(() => getCachedAdminActivityLogs());
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLog, setSelectedLog] = useState<AdminActivityLog | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAdminActivityLogs((updatedLogs) => {
      setLogs(updatedLogs);
    });
    return () => unsubscribe();
  }, []);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesType = filterType === "all" || log.targetType === filterType;
    const matchesSeverity = filterSeverity === "all" || log.severity === filterSeverity;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      log.adminEmail.toLowerCase().includes(query) ||
      log.targetName.toLowerCase().includes(query) ||
      log.summary.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query);

    return matchesType && matchesSeverity && matchesSearch;
  });

  const getTargetIcon = (targetType: string) => {
    switch (targetType) {
      case "gateway":
        return <CreditCard className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case "aggregator":
        return <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case "service_routing":
        return <RefreshCw className="w-4 h-4 text-amber-500" />;
      default:
        return <Settings className="w-4 h-4 text-slate-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return (
          <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            Critical
          </span>
        );
      case "warning":
        return (
          <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            Warning
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
            Info
          </span>
        );
    }
  };

  const exportLogsAsJson = () => {
    setIsExporting(true);
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `payclick_admin_audit_logs_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } finally {
      setTimeout(() => setIsExporting(false), 500);
    }
  };

  const exportLogsAsCsv = () => {
    setIsExporting(true);
    try {
      const headers = ["Timestamp", "Admin Email", "Action", "Target Type", "Target Name", "Summary", "Severity"];
      const rows = logs.map((l) => [
        `"${new Date(l.timestamp).toLocaleString()}"`,
        `"${l.adminEmail}"`,
        `"${l.action}"`,
        `"${l.targetType}"`,
        `"${l.targetName.replace(/"/g, '""')}"`,
        `"${l.summary.replace(/"/g, '""')}"`,
        `"${l.severity}"`
      ]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `payclick_admin_audit_logs_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } finally {
      setTimeout(() => setIsExporting(false), 500);
    }
  };

  const warningCount = logs.filter(
    (l) => l.severity === "warning" || l.severity === "critical"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header and Export Tools */}
      <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              Administrator Activity & Audit Logs
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable chronological audit record of all payment gateway modifications, aggregator adjustments, key updates, and service routing changes.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportLogsAsCsv}
            disabled={isExporting || logs.length === 0}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={exportLogsAsJson}
            disabled={isExporting || logs.length === 0}
            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-purple-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* WARNING ALERT BANNER FOR RECENT AUDIT WARNINGS */}
      {warningCount > 0 && (
        <div className="bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/40 rounded-2xl p-4 flex items-start gap-3.5 shadow-xs animate-fade-in">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <span>Security & Audit Alert: {warningCount} Warning / High Impact Change(s) Recorded</span>
            </h4>
            <p className="text-xs text-amber-700 dark:text-amber-400/90 leading-relaxed">
              Administrative modifications affecting credentials, default vending providers, or deletion of payment channels have been logged for governance and auditability.
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by admin email, gateway, action..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-slate-800 dark:text-white focus:ring-purple-600 focus:border-purple-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {/* Target Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 focus:ring-purple-600 focus:border-purple-600 focus:outline-none"
          >
            <option value="all">All Targets</option>
            <option value="gateway">Payment Gateways</option>
            <option value="aggregator">Aggregators</option>
            <option value="service_routing">Service Routing</option>
            <option value="system">System Settings</option>
          </select>

          {/* Severity Filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 focus:ring-purple-600 focus:border-purple-600 focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Logs Table / Stream */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-xs font-bold text-slate-400">
              {logs.length === 0
                ? "No administrator modifications recorded yet. All future gateway and aggregator adjustments will appear here."
                : "No activity logs match your filter criteria."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-gray-800/80 bg-slate-50/50 dark:bg-gray-950/50 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-500">
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Administrator</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Action & Summary</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800/60 text-xs">
                {filteredLogs.map((log) => {
                  const dateObj = new Date(log.timestamp);
                  const formattedDate = dateObj.toLocaleDateString();
                  const formattedTime = dateObj.toLocaleTimeString();

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className={cn(
                        "cursor-pointer transition-colors",
                        log.severity === "critical"
                          ? "bg-rose-500/5 hover:bg-rose-500/10 dark:bg-rose-950/20 dark:hover:bg-rose-950/30"
                          : log.severity === "warning"
                          ? "bg-amber-500/5 hover:bg-amber-500/10 dark:bg-amber-950/20 dark:hover:bg-amber-950/30"
                          : "hover:bg-slate-50 dark:hover:bg-gray-850/50"
                      )}
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-mono text-slate-800 dark:text-slate-200 font-bold text-[11px]">
                          {formattedTime}
                        </div>
                        <div className="text-[10px] text-slate-400">{formattedDate}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-[180px]">{log.adminEmail}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                          {getTargetIcon(log.targetType)}
                          <span className="truncate max-w-[160px]">{log.targetName}</span>
                        </div>
                        <div className="text-[9.5px] uppercase font-mono text-slate-400">
                          {log.targetType.replace("_", " ")}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 max-w-[320px]">
                        <span className="font-extrabold uppercase text-[10px] text-slate-700 dark:text-slate-300 mr-1.5 px-1.5 py-0.5 bg-slate-100 dark:bg-gray-800 rounded">
                          {log.action.replace("_", " ")}
                        </span>
                        <span className="text-slate-600 dark:text-slate-300 text-xs leading-snug">
                          {log.summary}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getSeverityBadge(log.severity)}
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="px-2.5 py-1 text-[10px] font-extrabold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-600 hover:text-white rounded-lg transition-all cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fade-in">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {getTargetIcon(selectedLog.targetType)}
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Audit Log Inspection
                  </h3>
                </div>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  ID: {selectedLog.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* WARNING / CRITICAL ALERT CALLOUT */}
            {selectedLog.severity === "warning" && (
              <div className="p-3 bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">Warning Alert: Route / Key Modification</p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400/90 leading-tight">
                    This modification changed vendor keys or switched default traffic routes. Verify that the changes match your expected infrastructure operations.
                  </p>
                </div>
              </div>
            )}

            {selectedLog.severity === "critical" && (
              <div className="p-3 bg-rose-500/10 dark:bg-rose-950/40 border border-rose-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300">
                <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">High Severity Alert: Entity Deletion</p>
                  <p className="text-[11px] text-rose-700 dark:text-rose-400/90 leading-tight">
                    A payment gateway or aggregator switch was permanently deleted by an administrator. Check active service routing to prevent customer transaction failures.
                  </p>
                </div>
              </div>
            )}

            <div className="p-4 bg-slate-50 dark:bg-gray-950/60 rounded-2xl border border-slate-100 dark:border-gray-850 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-gray-800">
                <span className="text-slate-400">Timestamp:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {new Date(selectedLog.timestamp).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-gray-800">
                <span className="text-slate-400">Administrator:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedLog.adminEmail}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-gray-800">
                <span className="text-slate-400">Target Type:</span>
                <span className="font-mono uppercase font-bold text-slate-800 dark:text-slate-200">
                  {selectedLog.targetType}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-gray-800">
                <span className="text-slate-400">Target Name:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedLog.targetName}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-gray-800">
                <span className="text-slate-400">Action:</span>
                <span className="font-mono font-bold uppercase text-purple-600 dark:text-purple-400">
                  {selectedLog.action}
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-slate-400">Severity Level:</span>
                <span>{getSeverityBadge(selectedLog.severity)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Event Summary & Changes
              </label>
              <div className="p-3 bg-slate-50 dark:bg-gray-950 rounded-xl border border-slate-200 dark:border-gray-850 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
                {selectedLog.summary}
              </div>
            </div>

            {selectedLog.details && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Raw Payload Snapshot
                </label>
                <div className="p-3 bg-slate-950 text-slate-200 rounded-xl border border-slate-800 text-[11px] font-mono max-h-40 overflow-y-auto">
                  <pre>
                    {typeof selectedLog.details === "string"
                      ? selectedLog.details
                      : JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedLog(null)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Close Record
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
