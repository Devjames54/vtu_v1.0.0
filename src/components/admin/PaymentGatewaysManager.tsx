import React, { useState } from "react";
import { 
  CreditCard, 
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
  Building2,
  QrCode,
  Smartphone,
  AlertTriangle
} from "lucide-react";
import { PaymentGatewayConfig } from "@/types/admin";
import { cn } from "@/lib/utils";
import { logAdminActivity } from "@/lib/activityLogger";

interface PaymentGatewaysManagerProps {
  gateways: PaymentGatewayConfig[];
  onUpdateGateways: (updated: PaymentGatewayConfig[]) => void;
  onSaveToCloud: () => void;
  isSaving: boolean;
  adminEmail?: string;
}

export function PaymentGatewaysManager({
  gateways,
  onUpdateGateways,
  onSaveToCloud,
  isSaving,
  adminEmail = "admin@payclick.com"
}: PaymentGatewaysManagerProps) {
  const [editingGateway, setEditingGateway] = useState<PaymentGatewayConfig | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState<Record<string, boolean>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form state for creating/editing
  const [formState, setFormState] = useState<Partial<PaymentGatewayConfig>>({
    name: "Paystack Gateway",
    provider: "paystack",
    status: "active",
    environment: "live",
    isDefault: false,
    publicKey: "",
    secretKey: "",
    merchantId: "",
    webhookSecret: "",
    supportedMethods: ["card", "transfer", "ussd", "qr"],
    feePercentage: 1.5,
    fixedFee: 0,
    notes: ""
  });

  const toggleShowSecret = (id: string) => {
    setShowSecretKey(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleStatus = (id: string) => {
    const targetGw = gateways.find(g => g.id === id);
    const nextStatus: "active" | "inactive" = targetGw?.status === "active" ? "inactive" : "active";

    const updated = gateways.map(gw => {
      if (gw.id === id) {
        return {
          ...gw,
          status: nextStatus
        };
      }
      return gw;
    });
    onUpdateGateways(updated);

    logAdminActivity({
      adminEmail,
      action: "toggle_status",
      targetType: "gateway",
      targetId: id,
      targetName: targetGw?.name || "Payment Gateway",
      summary: `Toggled status of ${targetGw?.name || "Gateway"} to ${nextStatus.toUpperCase()}`,
      severity: "info"
    });
  };

  const handleSetDefault = (id: string) => {
    const targetGw = gateways.find(g => g.id === id);
    const updated = gateways.map(gw => ({
      ...gw,
      isDefault: gw.id === id
    }));
    onUpdateGateways(updated);

    logAdminActivity({
      adminEmail,
      action: "set_default",
      targetType: "gateway",
      targetId: id,
      targetName: targetGw?.name || "Payment Gateway",
      summary: `Designated ${targetGw?.name || "Gateway"} as the default payment collection route`,
      severity: "warning"
    });
  };

  const handleDelete = (id: string) => {
    const targetGw = gateways.find(g => g.id === id);
    const updated = gateways.filter(gw => gw.id !== id);
    onUpdateGateways(updated);
    setConfirmDeleteId(null);

    logAdminActivity({
      adminEmail,
      action: "delete",
      targetType: "gateway",
      targetId: id,
      targetName: targetGw?.name || "Payment Gateway",
      summary: `Permanently removed payment gateway: ${targetGw?.name || id}`,
      severity: "critical"
    });
  };

  const handleOpenAddModal = (presetProvider?: PaymentGatewayConfig["provider"]) => {
    const provider = presetProvider || "paystack";
    let name = "Paystack Gateway";
    let methods: ("card" | "transfer" | "ussd" | "qr" | "barter")[] = ["card", "transfer", "ussd", "qr"];
    let fee = 1.5;

    if (provider === "flutterwave") {
      name = "Flutterwave (FLW)";
      methods = ["card", "transfer", "ussd", "barter"];
      fee = 1.4;
    } else {
      name = "Paystack Official";
      methods = ["card", "transfer", "ussd", "qr"];
      fee = 1.5;
    }

    setFormState({
      id: `gw_${provider}_${Date.now()}`,
      name,
      provider,
      status: "active",
      environment: "live",
      isDefault: gateways.length === 0,
      publicKey: "",
      secretKey: "",
      merchantId: "",
      webhookSecret: "",
      supportedMethods: methods,
      feePercentage: fee,
      fixedFee: 0,
      notes: ""
    });
    setIsCreatingNew(true);
    setEditingGateway(null);
  };

  const handleOpenEditModal = (gw: PaymentGatewayConfig) => {
    setFormState({ ...gw });
    setEditingGateway(gw);
    setIsCreatingNew(false);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name || !formState.provider) return;

    if (isCreatingNew) {
      const newGw: PaymentGatewayConfig = {
        id: formState.id || `gw_${formState.provider}_${Date.now()}`,
        name: formState.name,
        provider: formState.provider as any,
        status: formState.status || "active",
        isDefault: Boolean(formState.isDefault),
        environment: formState.environment || "live",
        publicKey: formState.publicKey || "",
        secretKey: formState.secretKey || "",
        merchantId: formState.merchantId || "",
        webhookSecret: formState.webhookSecret || "",
        supportedMethods: formState.supportedMethods || ["card", "transfer"],
        feePercentage: formState.feePercentage ?? 1.5,
        fixedFee: formState.fixedFee ?? 0,
        notes: formState.notes || ""
      };

      let updated = [...gateways, newGw];
      if (newGw.isDefault) {
        updated = updated.map(g => ({ ...g, isDefault: g.id === newGw.id }));
      }
      onUpdateGateways(updated);

      logAdminActivity({
        adminEmail,
        action: "create",
        targetType: "gateway",
        targetId: newGw.id,
        targetName: newGw.name,
        summary: `Created new payment gateway: ${newGw.name} (${newGw.provider.toUpperCase()} - ${newGw.environment})`,
        severity: "info",
        details: { provider: newGw.provider, environment: newGw.environment, fee: newGw.feePercentage }
      });
    } else if (editingGateway) {
      let updated = gateways.map(g => {
        if (g.id === editingGateway.id) {
          return {
            ...g,
            ...formState,
            id: g.id
          } as PaymentGatewayConfig;
        }
        return g;
      });

      if (formState.isDefault) {
        updated = updated.map(g => ({ ...g, isDefault: g.id === editingGateway.id }));
      }
      onUpdateGateways(updated);

      logAdminActivity({
        adminEmail,
        action: "update",
        targetType: "gateway",
        targetId: editingGateway.id,
        targetName: formState.name || editingGateway.name,
        summary: `Updated parameters and API keys for ${formState.name || editingGateway.name}`,
        severity: "warning",
        details: { feePercentage: formState.feePercentage, environment: formState.environment, methods: formState.supportedMethods }
      });
    }

    setIsCreatingNew(false);
    setEditingGateway(null);
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case "flutterwave":
        return "text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800";
      case "paystack":
      default:
        return "text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Quick Actions */}
      <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              Payment Gateways Switchboard
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure approved payment collection provider (Paystack Official) with real-time routing.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="dropdown relative">
            <button
              onClick={() => handleOpenAddModal("paystack")}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shadow-purple-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Configure Paystack</span>
            </button>
          </div>

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

      {/* Preset Quick Badges - Only Paystack */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Approved Gateway:</span>
        <button
          onClick={() => handleOpenAddModal("paystack")}
          className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Paystack Official</span>
        </button>
      </div>

      {/* WARNING ALERT FOR GATEWAYS CONFIGURATION */}
      {(!gateways.some(g => g.status === "active") || !gateways.some(g => g.isDefault && g.status === "active")) && (
        <div className="p-4 bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/35 rounded-2xl flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300 animate-fade-in shadow-xs">
          <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <p className="font-bold">Configuration Alert: Payment Routing Notice</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400/90 leading-tight">
              {!gateways.some(g => g.status === "active")
                ? "Warning: Paystack payment gateway is currently inactive. User wallet funding will fail until Paystack is active."
                : "Warning: No active gateway is currently designated as Primary. Default fallback checkout will be utilized."}
            </p>
          </div>
        </div>
      )}

      {/* Gateway Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {gateways.filter(gw => gw.provider === "paystack").map((gw) => {
          const isActive = gw.status === "active";
          const isSecretVisible = Boolean(showSecretKey[gw.id]);

          return (
            <div
              key={gw.id}
              className={cn(
                "bg-white dark:bg-gray-900 rounded-2xl border p-4.5 transition-all shadow-xs space-y-3.5 relative overflow-hidden",
                isActive 
                  ? "border-slate-200 dark:border-gray-800" 
                  : "border-slate-100 dark:border-gray-850 opacity-75 bg-slate-50/50 dark:bg-gray-900/40"
              )}
            >
              {/* Top Row: Provider badge, Name, Status & Default */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs uppercase border", getProviderColor(gw.provider))}>
                    {gw.provider === "paystack" ? "PSK" : "FLW"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        {gw.name}
                      </h3>
                      {gw.isDefault && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn(
                        "text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded",
                        gw.environment === "live" 
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" 
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      )}>
                        {gw.environment === "live" ? "Live Production" : "Test Mode"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Fee: {gw.feePercentage || 1.5}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Toggle Button */}
                <button
                  onClick={() => handleToggleStatus(gw.id)}
                  title={isActive ? "Disable Gateway" : "Activate Gateway"}
                  className="cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                  {isActive ? (
                    <ToggleRight className="w-8 h-8 text-emerald-500 stroke-[1.5]" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                  )}
                </button>
              </div>

              {/* Supported Payment Channels */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider mr-1">Channels:</span>
                {(gw.supportedMethods || []).map((method) => (
                  <span
                    key={method}
                    className="px-2 py-0.5 bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-300 rounded-md text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1"
                  >
                    {method === "card" && <CreditCard className="w-3 h-3 text-purple-600 dark:text-purple-400" />}
                    {method === "transfer" && <Building2 className="w-3 h-3 text-emerald-500" />}
                    {method === "qr" && <QrCode className="w-3 h-3 text-amber-500" />}
                    {method === "ussd" && <Smartphone className="w-3 h-3 text-purple-500 dark:text-purple-400" />}
                    {method}
                  </span>
                ))}
              </div>

              {/* Warning Alert if Active but Missing Key */}
              {isActive && !gw.secretKey && (
                <div className="p-2.5 bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 rounded-xl flex items-start gap-2 text-[11px] text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>Warning: Secret key not provided. Customers will be unable to process transactions with this gateway.</span>
                </div>
              )}

              {/* API Keys Preview */}
              <div className="bg-slate-50 dark:bg-gray-950/60 p-2.5 rounded-xl border border-slate-100 dark:border-gray-850 space-y-1.5 text-[11px] font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Public Key:</span>
                  <span className="text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                    {gw.publicKey ? `${gw.publicKey.slice(0, 10)}...${gw.publicKey.slice(-4)}` : <span className="text-amber-500 text-[10px]">Missing Key</span>}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Secret Key:</span>
                    <button
                      type="button"
                      onClick={() => toggleShowSecret(gw.id)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5"
                    >
                      {isSecretVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                  <span className="text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                    {gw.secretKey 
                      ? (isSecretVisible ? gw.secretKey : "••••••••••••••••••••••••") 
                      : <span className="text-amber-500 text-[10px]">Missing Key</span>}
                  </span>
                </div>

                {gw.merchantId && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Merchant ID:</span>
                    <span className="text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{gw.merchantId}</span>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-gray-850">
                <div className="flex items-center gap-2">
                  {!gw.isDefault && (
                    <button
                      onClick={() => handleSetDefault(gw.id)}
                      className="text-[10.5px] text-purple-600 dark:text-purple-400 hover:underline font-bold cursor-pointer"
                    >
                      Set as Primary
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditModal(gw)}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  {confirmDeleteId === gw.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(gw.id)}
                        className="px-2 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-bold"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="p-1 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(gw.id)}
                      className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 rounded-lg transition-all cursor-pointer"
                      title="Delete Gateway"
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

      {/* ADD / EDIT GATEWAY MODAL */}
      {(isCreatingNew || editingGateway) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full border border-slate-100 dark:border-gray-800 shadow-2xl p-5 my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-gray-850">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {isCreatingNew ? "Add Payment Gateway" : "Edit Payment Gateway"}
                </h3>
              </div>
              <button
                onClick={() => { setIsCreatingNew(false); setEditingGateway(null); }}
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
                    value={formState.provider}
                    onChange={(e) => setFormState(prev => ({ ...prev, provider: e.target.value as any }))}
                    className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:ring-purple-600 focus:outline-none"
                  >
                    <option value="paystack">Paystack Official</option>
                    <option value="flutterwave">Flutterwave (FLW)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Environment</label>
                  <select
                    value={formState.environment}
                    onChange={(e) => setFormState(prev => ({ ...prev, environment: e.target.value as any }))}
                    className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:ring-purple-600 focus:outline-none"
                  >
                    <option value="live">Live Production</option>
                    <option value="test">Test Mode</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Display Gateway Name</label>
                <input
                  type="text"
                  required
                  value={formState.name || ""}
                  onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. OPay Merchant Checkout"
                  className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:ring-purple-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Public Key / Client ID</label>
                  <input
                    type="text"
                    value={formState.publicKey || ""}
                    onChange={(e) => setFormState(prev => ({ ...prev, publicKey: e.target.value }))}
                    placeholder="pk_live_... or client_id"
                    className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-mono focus:ring-purple-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Secret Key / Secret Token</label>
                  <input
                    type="password"
                    value={formState.secretKey || ""}
                    onChange={(e) => setFormState(prev => ({ ...prev, secretKey: e.target.value }))}
                    placeholder="sk_live_... or secret_token"
                    className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-mono focus:ring-purple-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Merchant ID / Business Code</label>
                  <input
                    type="text"
                    value={formState.merchantId || ""}
                    onChange={(e) => setFormState(prev => ({ ...prev, merchantId: e.target.value }))}
                    placeholder="e.g. 256600000001"
                    className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-mono focus:ring-purple-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Fee Percentage (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formState.feePercentage ?? 1.5}
                    onChange={(e) => setFormState(prev => ({ ...prev, feePercentage: parseFloat(e.target.value) || 0 }))}
                    placeholder="1.5"
                    className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:ring-purple-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Supported Channels Selection */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Supported Payment Channels</label>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {["card", "transfer", "ussd", "qr"].map(channel => {
                    const isSelected = (formState.supportedMethods || []).includes(channel as any);
                    return (
                      <button
                        key={channel}
                        type="button"
                        onClick={() => {
                          const current = formState.supportedMethods || [];
                          const updated = isSelected 
                            ? current.filter(c => c !== channel) 
                            : [...current, channel as any];
                          setFormState(prev => ({ ...prev, supportedMethods: updated }));
                        }}
                        className={cn(
                          "py-2 px-2 rounded-xl border text-center font-bold text-[11px] capitalize transition-all cursor-pointer",
                          isSelected
                            ? "bg-purple-600 text-white border-purple-600 shadow-xs shadow-purple-500/20"
                            : "bg-slate-50 dark:bg-gray-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-gray-800"
                        )}
                      >
                        {channel}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Default & Status Checkboxes */}
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={Boolean(formState.isDefault)}
                    onChange={(e) => setFormState(prev => ({ ...prev, isDefault: e.target.checked }))}
                    className="rounded text-purple-600 focus:ring-0"
                  />
                  <span>Set as Primary Gateway</span>
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
                  onClick={() => { setIsCreatingNew(false); setEditingGateway(null); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer shadow-purple-500/20"
                >
                  {isCreatingNew ? "Add Gateway" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
