import React, { useState } from "react";
import { 
  Layers, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  ToggleLeft, 
  ToggleRight, 
  Zap, 
  Lock, 
  Eye, 
  EyeOff, 
  Radio, 
  Save, 
  RefreshCw,
  Globe,
  Activity,
  Server,
  Smartphone,
  Tv,
  FileCheck,
  Dices,
  AlertCircle,
  AlertTriangle
} from "lucide-react";
import { AggregatorConfig, ServiceRoutingConfig } from "@/types/admin";
import { logAdminActivity } from "@/lib/activityLogger";
import { cn } from "@/lib/utils";

interface AggregatorsManagerProps {
  aggregators: AggregatorConfig[];
  serviceRouting: ServiceRoutingConfig;
  onUpdateAggregators: (updated: AggregatorConfig[]) => void;
  onUpdateServiceRouting: (updated: ServiceRoutingConfig) => void;
  onSaveToCloud: () => void;
  isSaving: boolean;
  adminEmail?: string;
  onNavigateToMonitoring?: () => void;
}

export function AggregatorsManager({
  aggregators,
  serviceRouting,
  onUpdateAggregators,
  onUpdateServiceRouting,
  onSaveToCloud,
  isSaving,
  adminEmail = "admin@payclick.ng",
  onNavigateToMonitoring
}: AggregatorsManagerProps) {
  const [editingAggregator, setEditingAggregator] = useState<AggregatorConfig | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  // Ping status tracking
  const [pingStates, setPingStates] = useState<Record<string, { loading?: boolean; result?: string; status?: "success" | "warning" | "error" }>>({});

  // Form state for creating/editing
  const [formState, setFormState] = useState<Partial<AggregatorConfig>>({
    name: "",
    providerType: "vtpass",
    status: "active",
    isPrimary: false,
    userId: "",
    apiKey: "",
    publicKey: "",
    apiUrl: "https://api-service.vtpass.com/api",
    activeServices: ["airtime", "data", "electricity", "cables"],
    balance: 0,
    notes: ""
  });

  const toggleShowKey = (id: string) => {
    setShowApiKey(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleStatus = (id: string) => {
    const targetAgg = aggregators.find(a => a.id === id);
    const nextStatus: "active" | "inactive" = targetAgg?.status === "active" ? "inactive" : "active";

    const updated = aggregators.map(agg => {
      if (agg.id === id) {
        return {
          ...agg,
          status: nextStatus
        };
      }
      return agg;
    });
    onUpdateAggregators(updated);

    logAdminActivity({
      adminEmail,
      action: "toggle_status",
      targetType: "aggregator",
      targetId: id,
      targetName: targetAgg?.name || "Aggregator",
      summary: `Toggled status of aggregator ${targetAgg?.name || id} to ${nextStatus.toUpperCase()}`,
      severity: "info"
    });
  };

  const handleSetPrimary = (id: string) => {
    const targetAgg = aggregators.find(a => a.id === id);
    const updated = aggregators.map(agg => ({
      ...agg,
      isPrimary: agg.id === id
    }));
    onUpdateAggregators(updated);

    logAdminActivity({
      adminEmail,
      action: "set_default",
      targetType: "aggregator",
      targetId: id,
      targetName: targetAgg?.name || "Aggregator",
      summary: `Designated ${targetAgg?.name || id} as primary vending aggregator`,
      severity: "warning"
    });
  };

  const handleDelete = (id: string) => {
    const targetAgg = aggregators.find(a => a.id === id);
    const updated = aggregators.filter(agg => agg.id !== id);
    onUpdateAggregators(updated);
    setConfirmDeleteId(null);

    logAdminActivity({
      adminEmail,
      action: "delete",
      targetType: "aggregator",
      targetId: id,
      targetName: targetAgg?.name || "Aggregator",
      summary: `Permanently removed aggregator switch: ${targetAgg?.name || id}`,
      severity: "critical"
    });
  };

  const handlePingAggregator = async (agg: AggregatorConfig) => {
    setPingStates(prev => ({ ...prev, [agg.id]: { loading: true } }));
    try {
      const res = await fetch("/api/aggregators/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerType: agg.providerType,
          apiUrl: agg.apiUrl,
          userId: agg.userId,
          apiKey: agg.apiKey
        })
      });
      const data = await res.json();
      setPingStates(prev => ({
        ...prev,
        [agg.id]: {
          loading: false,
          result: data.message || `Status: ${data.status}`,
          status: data.status === "success" ? "success" : "warning"
        }
      }));
    } catch (e: any) {
      setPingStates(prev => ({
        ...prev,
        [agg.id]: {
          loading: false,
          result: e.message || "Connection timeout",
          status: "error"
        }
      }));
    }
  };

  const handleOpenAddModal = (presetType?: AggregatorConfig["providerType"]) => {
    const provider = presetType || "clubkonnect";
    let name = "ClubKonnect / NelloByte Systems";
    let url = "https://www.nellobytesystems.com";
    let services: AggregatorConfig["activeServices"] = ["airtime", "data", "electricity", "cables", "exam_pins", "betting"];

    if (provider === "clubkonnect") {
      name = "ClubKonnect / NelloByte Systems";
      url = "https://www.nellobytesystems.com";
      services = ["airtime", "data", "electricity", "cables", "exam_pins", "betting"];
    }

    setFormState({
      id: `agg_${provider}_${Date.now()}`,
      name,
      providerType: provider,
      status: "active",
      isPrimary: aggregators.length === 0,
      userId: "",
      apiKey: "",
      publicKey: "",
      apiUrl: url,
      activeServices: services,
      balance: 0,
      notes: ""
    });
    setIsCreatingNew(true);
    setEditingAggregator(null);
  };

  const handleOpenEditModal = (agg: AggregatorConfig) => {
    setFormState({ ...agg });
    setEditingAggregator(agg);
    setIsCreatingNew(false);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name || !formState.providerType) return;

    if (isCreatingNew) {
      const newAgg: AggregatorConfig = {
        id: formState.id || `agg_${formState.providerType}_${Date.now()}`,
        name: formState.name,
        providerType: formState.providerType as any,
        status: formState.status || "active",
        isPrimary: Boolean(formState.isPrimary),
        userId: formState.userId || "",
        apiKey: formState.apiKey || "",
        publicKey: formState.publicKey || "",
        apiUrl: formState.apiUrl || "https://api.vending.com",
        activeServices: formState.activeServices || ["airtime", "data"],
        balance: formState.balance || 0,
        notes: formState.notes || ""
      };

      let updated = [...aggregators, newAgg];
      if (newAgg.isPrimary) {
        updated = updated.map(a => ({ ...a, isPrimary: a.id === newAgg.id }));
      }
      onUpdateAggregators(updated);

      logAdminActivity({
        adminEmail,
        action: "create",
        targetType: "aggregator",
        targetId: newAgg.id,
        targetName: newAgg.name,
        summary: `Configured new ${newAgg.providerType.toUpperCase()} aggregator: ${newAgg.name}`,
        severity: "info",
        details: {
          providerType: newAgg.providerType,
          apiUrl: newAgg.apiUrl,
          activeServices: newAgg.activeServices,
          isPrimary: newAgg.isPrimary
        }
      });
    } else if (editingAggregator) {
      const isKeyChanged = formState.apiKey !== editingAggregator.apiKey || formState.userId !== editingAggregator.userId;
      let updated = aggregators.map(a => {
        if (a.id === editingAggregator.id) {
          return {
            ...a,
            ...formState,
            id: a.id
          } as AggregatorConfig;
        }
        return a;
      });

      if (formState.isPrimary) {
        updated = updated.map(a => ({ ...a, isPrimary: a.id === editingAggregator.id }));
      }
      onUpdateAggregators(updated);

      logAdminActivity({
        adminEmail,
        action: isKeyChanged ? "credential_change" : "update",
        targetType: "aggregator",
        targetId: editingAggregator.id,
        targetName: formState.name || editingAggregator.name,
        summary: isKeyChanged 
          ? `Updated credentials & API endpoints for aggregator: ${formState.name || editingAggregator.name}`
          : `Saved settings update for aggregator: ${formState.name || editingAggregator.name}`,
        severity: isKeyChanged ? "warning" : "info",
        details: {
          providerType: formState.providerType,
          apiUrl: formState.apiUrl,
          activeServices: formState.activeServices
        }
      });
    }

    setIsCreatingNew(false);
    setEditingAggregator(null);
  };

  const handleRoutingChange = (service: keyof ServiceRoutingConfig, aggregatorId: string) => {
    const previousAggId = serviceRouting[service];
    const newAgg = aggregators.find(a => a.id === aggregatorId);
    onUpdateServiceRouting({
      ...serviceRouting,
      [service]: aggregatorId
    });

    logAdminActivity({
      adminEmail,
      action: "routing_change",
      targetType: "service_routing",
      targetId: service,
      targetName: `${service.toUpperCase()} Service Route`,
      summary: `Re-routed ${service.toUpperCase()} traffic to aggregator ${newAgg?.name || aggregatorId}`,
      severity: "warning",
      details: {
        service,
        fromAggregatorId: previousAggId,
        toAggregatorId: aggregatorId
      }
    });
  };

  const hasRoutingWarning = Object.entries(serviceRouting).some(([_, aggId]) => {
    const agg = aggregators.find(a => a.id === aggId);
    return !agg || agg.status !== "active";
  }) || !aggregators.some(a => a.status === "active");

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              VTU Aggregators & Vending Engines
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage wholesale telecommunication switches (ClubKonnect, VTpass, eBills, Alrahuz, etc.) with service routing.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onNavigateToMonitoring && (
            <button
              onClick={onNavigateToMonitoring}
              className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Activity className="w-4 h-4 text-purple-500 animate-pulse" />
              <span>Real-Time Health Monitoring</span>
            </button>
          )}

          <button
            onClick={() => handleOpenAddModal("clubkonnect")}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shadow-purple-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Aggregator</span>
          </button>

          <button
            onClick={onSaveToCloud}
            disabled={isSaving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save All to Cloud</span>
          </button>
        </div>
      </div>

      {/* Preset Quick Badges: ClubKonnect Only */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Approved Aggregator:</span>
        <button
          onClick={() => handleOpenAddModal("clubkonnect")}
          className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>+ ClubKonnect (NelloByte)</span>
        </button>
      </div>

      {/* ROUTING WARNING ALERT BANNER */}
      {hasRoutingWarning && (
        <div className="p-4 bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/35 rounded-2xl flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300 animate-fade-in shadow-xs">
          <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <p className="font-bold">Switchboard Alert: Routing Configuration Warning</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400/90 leading-tight">
              One or more utility services are currently assigned to an aggregator that is disabled or unconfigured. Re-assign service routes to active vending engines to prevent transaction fulfillment failures.
            </p>
          </div>
        </div>
      )}

      {/* SERVICE ROUTING SWITCHBOARD */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Live Service Routing Switchboard
              </h3>
              <p className="text-[10.5px] text-slate-400">
                Direct which aggregator handles each utility service in real time.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { key: "airtime", label: "Airtime Vending", icon: Smartphone, color: "text-purple-600 dark:text-purple-400" },
            { key: "data", label: "Data Bundles (SME/Direct)", icon: Radio, color: "text-emerald-500" },
            { key: "electricity", label: "Electricity Tokens", icon: Zap, color: "text-amber-500" },
            { key: "cables", label: "Cable TV (DStv, GOtv, Startimes)", icon: Tv, color: "text-purple-500" },
            { key: "exam_pins", label: "Exam PINs (WAEC, JAMB, NECO)", icon: FileCheck, color: "text-purple-400" },
            { key: "betting", label: "Betting Wallet Refill", icon: Dices, color: "text-rose-500" }
          ].map(({ key, label, icon: Icon, color }) => {
            const currentAggId = (serviceRouting as any)[key] || "agg_clubkonnect";
            const currentAgg = aggregators.find(a => a.id === currentAggId);
            const isAggInactive = !currentAgg || currentAgg.status !== "active";

            return (
              <div key={key} className={cn(
                "p-3 rounded-xl border space-y-2 transition-all",
                isAggInactive 
                  ? "bg-amber-500/5 dark:bg-amber-950/20 border-amber-500/30" 
                  : "bg-slate-50 dark:bg-gray-950/60 border-slate-150 dark:border-gray-850"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("w-4 h-4", color)} />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{label}</span>
                  </div>
                  {isAggInactive && (
                    <span className="flex items-center gap-1 text-[9.5px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Inactive Route
                    </span>
                  )}
                </div>
                <select
                  value={currentAggId}
                  onChange={(e) => handleRoutingChange(key as any, e.target.value)}
                  className="w-full bg-white dark:bg-gray-900 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:ring-purple-600 focus:outline-none"
                >
                  {aggregators.map(agg => (
                    <option key={agg.id} value={agg.id}>
                      {agg.name} {agg.status === "inactive" ? "(Inactive)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      {/* Aggregators List Grid - Exclusively ClubKonnect */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {aggregators.filter(agg => agg.providerType === "clubkonnect").map((agg) => {
          const isActive = agg.status === "active";
          const isKeyVisible = Boolean(showApiKey[agg.id]);
          const ping = pingStates[agg.id];

          return (
            <div
              key={agg.id}
              className={cn(
                "bg-white dark:bg-gray-900 rounded-2xl border p-4.5 transition-all shadow-xs space-y-3.5 relative overflow-hidden",
                isActive 
                  ? "border-slate-200 dark:border-gray-800" 
                  : "border-slate-100 dark:border-gray-850 opacity-75 bg-slate-50/50 dark:bg-gray-900/40"
              )}
            >
              {/* Top Row: Provider badge, Name, Status & Primary */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs uppercase border text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-850">
                    <Server className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        {agg.name}
                      </h3>
                      {agg.isPrimary && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400 font-mono">
                        Type: {agg.providerType}
                      </span>
                      <span className={cn(
                        "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded",
                        isActive ? "bg-emerald-500/15 text-emerald-600" : "bg-slate-200 dark:bg-gray-800 text-slate-500"
                      )}>
                        {isActive ? "Active" : "Disabled"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Toggle Button */}
                <button
                  onClick={() => handleToggleStatus(agg.id)}
                  title={isActive ? "Disable Aggregator" : "Activate Aggregator"}
                  className="cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                  {isActive ? (
                    <ToggleRight className="w-8 h-8 text-emerald-500 stroke-[1.5]" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                  )}
                </button>
              </div>

              {/* Warning Alert if Active but Missing Key or User ID */}
              {isActive && (!agg.apiKey || (agg.providerType === "clubkonnect" && !agg.userId)) && (
                <div className="p-2.5 bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 rounded-xl flex items-start gap-2 text-[11px] text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>Warning: Essential API credentials missing. Telecom vending requests routed here will fail authentication.</span>
                </div>
              )}

              {/* Active Services Badges */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider mr-1">Services:</span>
                {(agg.activeServices || []).map((service) => (
                  <span
                    key={service}
                    className="px-2 py-0.5 bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-300 rounded-md text-[10px] font-semibold capitalize"
                  >
                    {service.replace("_", " ")}
                  </span>
                ))}
              </div>

              {/* API Credentials Details */}
              <div className="bg-slate-50 dark:bg-gray-950/60 p-2.5 rounded-xl border border-slate-100 dark:border-gray-850 space-y-1.5 text-[11px] font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">User ID / Code:</span>
                  <span className="text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                    {agg.userId || <span className="text-amber-500 text-[10px]">Not Configured</span>}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">API Key:</span>
                    <button
                      type="button"
                      onClick={() => toggleShowKey(agg.id)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5"
                    >
                      {isKeyVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                  <span className="text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                    {agg.apiKey 
                      ? (isKeyVisible ? agg.apiKey : "••••••••••••••••••••••••") 
                      : <span className="text-amber-500 text-[10px]">Not Configured</span>}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Endpoint URL:</span>
                  <span className="text-slate-800 dark:text-slate-200 truncate max-w-[200px] text-[10px]">
                    {agg.apiUrl}
                  </span>
                </div>
              </div>

              {/* Ping Result Banner */}
              {ping?.result && (
                <div className={cn(
                  "p-2 rounded-xl text-[11px] font-bold flex items-center gap-2 border",
                  ping.status === "success" 
                    ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" 
                    : "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                )}>
                  {ping.status === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span className="truncate">{ping.result}</span>
                </div>
              )}

              {/* Footer Actions */}
              <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-gray-850">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePingAggregator(agg)}
                    disabled={ping?.loading}
                    className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-600 dark:text-purple-400 rounded-lg text-[10.5px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    {ping?.loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
                    <span>Test Ping</span>
                  </button>

                  {!agg.isPrimary && (
                    <button
                      onClick={() => handleSetPrimary(agg.id)}
                      className="text-[10.5px] text-purple-600 dark:text-purple-400 hover:underline font-bold cursor-pointer"
                    >
                      Make Primary
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditModal(agg)}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  {confirmDeleteId === agg.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(agg.id)}
                        className="px-2 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(agg.id)}
                      className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 rounded-lg transition-all cursor-pointer"
                      title="Delete Aggregator"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD / EDIT AGGREGATOR MODAL */}
      {(isCreatingNew || editingAggregator) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full border border-slate-100 dark:border-gray-800 shadow-2xl p-5 my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-gray-850">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {isCreatingNew ? "Add Aggregator Engine" : "Edit Aggregator Engine"}
                </h3>
              </div>
              <button
                onClick={() => { setIsCreatingNew(false); setEditingAggregator(null); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Provider Type</label>
                  <select
                    value={formState.providerType}
                    onChange={(e) => setFormState(prev => ({ ...prev, providerType: e.target.value as any }))}
                    className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:ring-purple-600 focus:outline-none"
                  >
                    <option value="clubkonnect">ClubKonnect (NelloByte)</option>
                    <option value="vtpass">VTpass Multi-Service</option>
                    <option value="ebills">eBills Pay Aggregator</option>
                    <option value="alrahuz">Alrahuz Data</option>
                    <option value="mobilenig">MobileNig</option>
                    <option value="custom">Custom Aggregator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    value={formState.name || ""}
                    onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. VTpass Multi-Service Hub"
                    className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:ring-purple-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">User ID / Username</label>
                  <input
                    type="text"
                    value={formState.userId || ""}
                    onChange={(e) => setFormState(prev => ({ ...prev, userId: e.target.value }))}
                    placeholder="CK10129... or username"
                    className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-mono focus:ring-purple-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">API Key / Secret Token</label>
                  <input
                    type="password"
                    value={formState.apiKey || ""}
                    onChange={(e) => setFormState(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="API Key / Secret"
                    className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-mono focus:ring-purple-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">API Base URL</label>
                <input
                  type="url"
                  required
                  value={formState.apiUrl || ""}
                  onChange={(e) => setFormState(prev => ({ ...prev, apiUrl: e.target.value }))}
                  placeholder="https://api-service.vtpass.com/api"
                  className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-mono focus:ring-purple-600 focus:outline-none"
                />
              </div>

              {/* Supported Services Selection */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Vended Services Handled</label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: "airtime", label: "Airtime" },
                    { id: "data", label: "Data" },
                    { id: "electricity", label: "Electricity" },
                    { id: "cables", label: "Cable TV" },
                    { id: "exam_pins", label: "Exam PINs" },
                    { id: "betting", label: "Betting" }
                  ].map(({ id, label }) => {
                    const isSelected = (formState.activeServices || []).includes(id as any);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          const current = formState.activeServices || [];
                          const updated = isSelected 
                            ? current.filter(s => s !== id) 
                            : [...current, id as any];
                          setFormState(prev => ({ ...prev, activeServices: updated }));
                        }}
                        className={cn(
                          "py-2 px-2 rounded-xl border text-center font-bold text-[11px] transition-all cursor-pointer",
                          isSelected
                            ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                            : "bg-slate-50 dark:bg-gray-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-gray-800"
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Primary & Active Checkboxes */}
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={Boolean(formState.isPrimary)}
                    onChange={(e) => setFormState(prev => ({ ...prev, isPrimary: e.target.checked }))}
                    className="rounded text-purple-600 focus:ring-0"
                  />
                  <span>Set as Primary Aggregator</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={formState.status === "active"}
                    onChange={(e) => setFormState(prev => ({ ...prev, status: e.target.checked ? "active" : "inactive" }))}
                    className="rounded text-emerald-500 focus:ring-0"
                  />
                  <span>Active & Ready</span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => { setIsCreatingNew(false); setEditingAggregator(null); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer shadow-purple-500/20"
                >
                  {isCreatingNew ? "Add Aggregator" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
