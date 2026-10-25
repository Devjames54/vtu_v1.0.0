import React, { useState, useEffect } from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Zap,
  Copy,
  ExternalLink,
  ShieldCheck,
  Terminal,
  Sliders,
  Server,
  Wifi,
  ChevronDown,
  ChevronUp,
  Download,
  Info,
  Key,
  Database,
  ArrowRight,
  Sparkles,
  PhoneCall,
  CreditCard,
  Layers,
  X
} from "lucide-react";

export interface DiagnosticTestResult {
  name: string;
  passed: boolean;
  status: "pass" | "warning" | "error";
  httpStatus?: number;
  latencyMs?: number;
  errorCode?: string;
  message?: string;
  details?: string;
  interpretation?: string;
  remediation?: string;
  raw?: any;
  [key: string]: any;
}

export interface DiagnosticsPayload {
  status: string;
  timestamp: string;
  totalDurationMs: number;
  summary: {
    clubkonnect: {
      overallStatus: "success" | "warning" | "error";
      userId: string;
      balance: string | number;
      phone: string;
    };
    paystack: {
      overallStatus: "success" | "warning" | "error";
      mode: string;
      publicKey: string;
    };
  };
  clubkonnect: {
    tests: Record<string, DiagnosticTestResult>;
    overallStatus: "success" | "warning" | "error";
  };
  paystack: {
    tests: Record<string, DiagnosticTestResult>;
    overallStatus: "success" | "warning" | "error";
  };
}

interface ApiDiagnosticsDashboardProps {
  isOpen?: boolean;
  onClose?: () => void;
  isModal?: boolean;
}

export function ApiDiagnosticsDashboard({
  isOpen = true,
  onClose,
  isModal = false
}: ApiDiagnosticsDashboardProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DiagnosticsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"handshake" | "credentials" | "decoder" | "raw">("handshake");
  
  // Custom credential override state
  const [useCustomKeys, setUseCustomKeys] = useState(false);
  const [customCkUserId, setCustomCkUserId] = useState("CK101290943");
  const [customCkApiKey, setCustomCkApiKey] = useState("L771Q3F7698VHR08X3VJZW846P79135WD991JVP0379BN4MNORWE2D4BO0ZMTR31");
  const [customPskSecret, setCustomPskSecret] = useState("sk_test_b8e59653ffe2ba5940bca226a2134e0fbcbbee92");
  const [customPskPublic, setCustomPskPublic] = useState("pk_test_3ac926ffefcedbc1ed98990286d61a1348351537");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Expanded raw test payloads accordion state
  const [expandedTests, setExpandedTests] = useState<Record<string, boolean>>({});

  const toggleTestExpand = (id: string) => {
    setExpandedTests((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const runDiagnostics = async (customConfig?: boolean) => {
    setLoading(true);
    setError(null);

    const payload: Record<string, string> = {};
    if (customConfig ?? useCustomKeys) {
      if (customCkUserId.trim()) payload.clubkonnectUserId = customCkUserId.trim();
      if (customCkApiKey.trim()) payload.clubkonnectApiKey = customCkApiKey.trim();
      if (customPskSecret.trim()) payload.paystackSecretKey = customPskSecret.trim();
      if (customPskPublic.trim()) payload.paystackPublicKey = customPskPublic.trim();
    }

    try {
      const res = await fetch("/api/diagnostics/handshake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
      }

      const report: DiagnosticsPayload = await res.json();
      setData(report);
    } catch (err: any) {
      setError(err.message || "Failed to execute diagnostic handshake suite.");
    } finally {
      setLoading(false);
    }
  };

  // Run initial test on mount
  useEffect(() => {
    if (isOpen && !data && !loading) {
      runDiagnostics();
    }
  }, [isOpen]);

  const downloadReport = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payclick-gateway-diagnostics-${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const content = (
    <div className="w-full max-w-5xl mx-auto bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
      {/* Top Header Bar */}
      <div className="p-4 sm:p-5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-purple-800 flex items-center justify-center shadow-lg shadow-purple-500/20 text-white">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                API Handshake & Diagnostic Suite
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                v2.4 Live
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Real-time ping, authentication verification, and error-code decoding for ClubKonnect & Paystack
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => runDiagnostics()}
            disabled={loading}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-purple-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Probing APIs..." : "Run Test"}</span>
          </button>

          {data && (
            <button
              type="button"
              onClick={downloadReport}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
              title="Download JSON Diagnostic Log"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 rounded-xl transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Summary Pill Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 sm:p-4 bg-slate-50 dark:bg-gray-950 border-b border-slate-200 dark:border-gray-800">
        {/* ClubKonnect Summary */}
        <div className="p-3 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">ClubKonnect VTU</div>
              <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{data?.summary.clubkonnect.userId || "CK101290943"}</span>
                {data?.summary.clubkonnect.balance !== undefined && (
                  <span className="text-[10px] text-slate-500 font-mono">
                    (₦{Number(data.summary.clubkonnect.balance).toFixed(2)})
                  </span>
                )}
              </div>
            </div>
          </div>
          <div>
            {data ? (
              data.summary.clubkonnect.overallStatus === "success" ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Ready
                </span>
              ) : data.summary.clubkonnect.overallStatus === "warning" ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Auth (₦0.00 Bal)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  Auth Error
                </span>
              )
            ) : (
              <span className="text-slate-400 text-xs font-mono">Waiting...</span>
            )}
          </div>
        </div>

        {/* Paystack Summary */}
        <div className="p-3 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Paystack Gateway</div>
              <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{data?.summary.paystack.mode || "Live Production"}</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {data?.summary.paystack.publicKey ? `${data.summary.paystack.publicKey.slice(0, 8)}...` : ""}
                </span>
              </div>
            </div>
          </div>
          <div>
            {data ? (
              data.summary.paystack.overallStatus === "success" ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  Error
                </span>
              )
            ) : (
              <span className="text-slate-400 text-xs font-mono">Waiting...</span>
            )}
          </div>
        </div>

        {/* Total Latency Summary */}
        <div className="p-3 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Roundtrip Latency</div>
              <div className="text-xs font-black text-slate-900 dark:text-white font-mono">
                {data ? `${data.totalDurationMs} ms total` : "—"}
              </div>
            </div>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-mono">
              {data ? new Date(data.timestamp).toLocaleTimeString() : "Ready"}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center px-4 bg-slate-100 dark:bg-gray-950/80 border-b border-slate-200 dark:border-gray-800 gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("handshake")}
          className={`py-3 px-3.5 text-xs font-black uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all ${
            activeTab === "handshake"
              ? "border-purple-600 text-purple-600 dark:text-purple-400 bg-white dark:bg-gray-900 rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Handshake Matrix</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("credentials")}
          className={`py-3 px-3.5 text-xs font-black uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all ${
            activeTab === "credentials"
              ? "border-purple-600 text-purple-600 dark:text-purple-400 bg-white dark:bg-gray-900 rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Credential Tester & Override</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("decoder")}
          className={`py-3 px-3.5 text-xs font-black uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all ${
            activeTab === "decoder"
              ? "border-purple-600 text-purple-600 dark:text-purple-400 bg-white dark:bg-gray-900 rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Info className="w-3.5 h-3.5" />
          <span>Error Code Decoder</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("raw")}
          className={`py-3 px-3.5 text-xs font-black uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all ${
            activeTab === "raw"
              ? "border-purple-600 text-purple-600 dark:text-purple-400 bg-white dark:bg-gray-900 rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Raw JSON Log</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
            <XCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold">Diagnostic Execution Error</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* TAB 1: HANDSHAKE MATRIX */}
        {activeTab === "handshake" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CLUBKONNECT COLUMN */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-purple-600 text-white flex items-center justify-center text-xs font-bold">
                    CK
                  </div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    ClubKonnect Telecom Protocol
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">nellobytesystems.com</span>
              </div>

              {loading && !data && (
                <div className="p-8 text-center space-y-3 bg-slate-50 dark:bg-gray-950 rounded-2xl border border-slate-200 dark:border-gray-800">
                  <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-500">Contacting ClubKonnect API servers...</p>
                </div>
              )}

              {data && (
                <div className="space-y-3">
                  {/* Test 1: Credentials */}
                  <TestCard
                    id="ck-creds"
                    test={data.clubkonnect.tests.credentials}
                    endpoint="Local Format Check"
                    method="AUTH"
                    isExpanded={expandedTests["ck-creds"]}
                    onToggle={() => toggleTestExpand("ck-creds")}
                  />

                  {/* Test 2: Wallet Balance */}
                  <TestCard
                    id="ck-wallet"
                    test={data.clubkonnect.tests.walletBalance}
                    endpoint="/APIWalletBalanceV1.asp"
                    method="GET"
                    isExpanded={expandedTests["ck-wallet"]}
                    onToggle={() => toggleTestExpand("ck-wallet")}
                  />

                  {/* Test 3: Data Bundle Catalog */}
                  <TestCard
                    id="ck-catalog"
                    test={data.clubkonnect.tests.catalog}
                    endpoint="/APIDatabundlePlansV2.asp"
                    method="GET"
                    isExpanded={expandedTests["ck-catalog"]}
                    onToggle={() => toggleTestExpand("ck-catalog")}
                  />

                  {/* Test 4: Airtime Vending Probe */}
                  <TestCard
                    id="ck-vending"
                    test={data.clubkonnect.tests.vendingProbe}
                    endpoint="/APIAirtimeV1.asp?dryRun=true"
                    method="GET"
                    isExpanded={expandedTests["ck-vending"]}
                    onToggle={() => toggleTestExpand("ck-vending")}
                  />
                </div>
              )}
            </div>

            {/* PAYSTACK COLUMN */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#0ba4db] text-white flex items-center justify-center text-xs font-bold">
                    PSK
                  </div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Paystack Payment Gateway
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">api.paystack.co</span>
              </div>

              {loading && !data && (
                <div className="p-8 text-center space-y-3 bg-slate-50 dark:bg-gray-950 rounded-2xl border border-slate-200 dark:border-gray-800">
                  <RefreshCw className="w-8 h-8 text-[#0ba4db] animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-500">Contacting Paystack Gateway endpoints...</p>
                </div>
              )}

              {data && (
                <div className="space-y-3">
                  {/* Test 1: Keys Syntax */}
                  <TestCard
                    id="psk-keys"
                    test={data.paystack.tests.keys}
                    endpoint="Local Key Format Check"
                    method="AUTH"
                    isExpanded={expandedTests["psk-keys"]}
                    onToggle={() => toggleTestExpand("psk-keys")}
                  />

                  {/* Test 2: Auth & Balance */}
                  <TestCard
                    id="psk-balance"
                    test={data.paystack.tests.authAndBalance}
                    endpoint="/balance"
                    method="GET"
                    isExpanded={expandedTests["psk-balance"]}
                    onToggle={() => toggleTestExpand("psk-balance")}
                  />

                  {/* Test 3: Transaction Initialization */}
                  <TestCard
                    id="psk-init"
                    test={data.paystack.tests.transactionInit}
                    endpoint="/transaction/initialize"
                    method="POST"
                    isExpanded={expandedTests["psk-init"]}
                    onToggle={() => toggleTestExpand("psk-init")}
                  />

                  {/* Test 4: Transaction Verification */}
                  <TestCard
                    id="psk-verify"
                    test={data.paystack.tests.transactionVerify}
                    endpoint="/transaction/verify/:ref"
                    method="GET"
                    isExpanded={expandedTests["psk-verify"]}
                    onToggle={() => toggleTestExpand("psk-verify")}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CREDENTIAL TESTER & OVERRIDE */}
        {activeTab === "credentials" && (
          <div className="space-y-6">
            <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 rounded-2xl p-4 flex items-start gap-3">
              <Key className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 dark:text-slate-300">
                <p className="font-bold text-slate-900 dark:text-white">
                  Live Credential Validator
                </p>
                <p className="mt-0.5">
                  Test alternate API keys on demand without modifying `.env` or persistent database settings.
                  This executes a live handshake against NelloByte Systems and Paystack using your custom keys.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ClubKonnect Custom Input */}
              <div className="p-4 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-gray-800">
                  <PhoneCall className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    ClubKonnect Test Keys
                  </h4>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      User ID
                    </label>
                    <input
                      type="text"
                      value={customCkUserId}
                      onChange={(e) => setCustomCkUserId(e.target.value)}
                      placeholder="e.g. CK101290943"
                      className="w-full bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={customCkApiKey}
                      onChange={(e) => setCustomCkApiKey(e.target.value)}
                      placeholder="e.g. L771Q3F7..."
                      className="w-full bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                    />
                  </div>
                </div>
              </div>

              {/* Paystack Custom Input */}
              <div className="p-4 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-gray-800">
                  <CreditCard className="w-4 h-4 text-[#0ba4db]" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Paystack Test Keys
                  </h4>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Secret Key
                    </label>
                    <input
                      type="password"
                      value={customPskSecret}
                      onChange={(e) => setCustomPskSecret(e.target.value)}
                      placeholder="sk_test_... or sk_live_..."
                      className="w-full bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0ba4db]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Public Key
                    </label>
                    <input
                      type="text"
                      value={customPskPublic}
                      onChange={(e) => setCustomPskPublic(e.target.value)}
                      placeholder="pk_test_... or pk_live_..."
                      className="w-full bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-gray-950 rounded-2xl">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enable-custom-keys"
                  checked={useCustomKeys}
                  onChange={(e) => setUseCustomKeys(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded"
                />
                <label htmlFor="enable-custom-keys" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Use custom keys for subsequent diagnostic runs
                </label>
              </div>

              <button
                type="button"
                onClick={() => {
                  setUseCustomKeys(true);
                  runDiagnostics(true);
                  setActiveTab("handshake");
                }}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-purple-500/20 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Test Handshake With These Keys</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: ERROR CODE DECODER */}
        {activeTab === "decoder" && (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                ClubKonnect Response Status Codes Reference
              </h3>

              <div className="border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-gray-800">
                <DecoderRow
                  code="ACCOUNT_MISMATCH_CONTACT_SUPPORT"
                  status="Zero Balance / Pending Activation"
                  color="amber"
                  meaning="The UserID and APIKey are authenticated by NelloByte servers, but the merchant wallet on clubkonnect.com has a balance of ₦0.00, or the user has not deposited merchant funds."
                  solution="Log into https://www.clubkonnect.com, fund your merchant account (e.g. ₦1,000 via Monnify/Bank), or message ClubKonnect WhatsApp support to enable API telecom vending for your ID."
                />
                <DecoderRow
                  code="INVALID_APICREDENTIALS"
                  status="Fatal Authentication Failure"
                  color="rose"
                  meaning="NelloByte rejected the UserID or APIKey. Either the UserID does not exist or the 64-character APIKey string is mismatched."
                  solution="Log into clubkonnect.com -> Developers/API -> Regenerate API Key, and paste the exact new key into the admin configuration."
                />
                <DecoderRow
                  code="ORDER_RECEIVED / ORDER_COMPLETED"
                  status="Success"
                  color="emerald"
                  meaning="Transaction accepted by telecom switch and dispatched to MTN/Glo/Airtel/9mobile network."
                  solution="Recipient phone number credited immediately; order reference recorded."
                />
                <DecoderRow
                  code="INSUFFICIENT_BALANCE"
                  status="Balance Depleted"
                  color="rose"
                  meaning="The cost of the requested data bundle or airtime exceeds current ClubKonnect merchant balance."
                  solution="Fund the merchant wallet on clubkonnect.com to continue vending."
                />
                <DecoderRow
                  code="INVALID_MOBILENETWORK"
                  status="Network Code Invalid"
                  color="amber"
                  meaning="Network prefix passed was unrecognized (valid codes: 01 for MTN, 02 for Glo, 03 for 9mobile, 04 for Airtel)."
                  solution="The app standardizes this automatically in `/api/clubkonnect/*`."
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#0ba4db]" />
                Paystack Status & HTTP Response Reference
              </h3>

              <div className="border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-gray-800">
                <DecoderRow
                  code="HTTP 200 (status: true)"
                  status="Fully Operational"
                  color="emerald"
                  meaning="Paystack Bearer token authenticated and endpoint request completed successfully."
                  solution="Live payments for Cards, Bank Transfer, and USSD are ready to accept customer money."
                />
                <DecoderRow
                  code="HTTP 401 Unauthorized"
                  status="Invalid Secret Key"
                  color="rose"
                  meaning="Paystack rejected the Authorization header. Secret key might be mistyped or revoked on the Paystack dashboard."
                  solution="Log in to dashboard.paystack.com -> Settings -> API Keys & Webhooks -> Copy Secret Key (`sk_test_...` or `sk_live_...`)."
                />
                <DecoderRow
                  code="Test Key Notice"
                  status="Test Key Active"
                  color="purple"
                  meaning="Using `sk_test_` and `pk_test_`. Real bank accounts will not be debited; Paystack official test card numbers will settle in test mode."
                  solution="To accept real customer naira, replace test keys with your verified Live keys (`sk_live_` and `pk_live_`)."
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: RAW JSON LOG */}
        {activeTab === "raw" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-500">
                Full server diagnostic response payload
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(JSON.stringify(data, null, 2), "raw-json")}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedKey === "raw-json" ? "Copied!" : "Copy Full JSON"}</span>
              </button>
            </div>

            <div className="p-4 bg-slate-950 text-slate-200 rounded-2xl font-mono text-xs overflow-x-auto max-h-[450px] border border-slate-800">
              <pre>{JSON.stringify(data, null, 2) || "Run diagnostics to view raw response payload."}</pre>
            </div>
          </div>
        )}
      </div>

      {/* Footer Status Bar */}
      <div className="p-3.5 bg-slate-50 dark:bg-gray-950 border-t border-slate-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>PayClick System Verification Engine</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span>ClubKonnect: {data?.summary.clubkonnect.userId || "CK101290943"}</span>
          <span>•</span>
          <span>Paystack: {data?.summary.paystack.mode || "Live Production"}</span>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
        {content}
      </div>
    );
  }

  return content;
}

// Sub-component: Individual Test Card
function TestCard({
  id,
  test,
  endpoint,
  method,
  isExpanded,
  onToggle
}: {
  id: string;
  test?: DiagnosticTestResult;
  endpoint: string;
  method: string;
  isExpanded?: boolean;
  onToggle: () => void;
}) {
  if (!test) return null;

  const isPass = test.status === "pass";
  const isWarning = test.status === "warning";
  const isError = test.status === "error";

  return (
    <div
      className={`border rounded-2xl transition-all overflow-hidden ${
        isPass
          ? "border-emerald-500/30 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.04]"
          : isWarning
          ? "border-amber-500/30 bg-amber-500/[0.02] dark:bg-amber-500/[0.04]"
          : "border-rose-500/30 bg-rose-500/[0.02] dark:bg-rose-500/[0.04]"
      }`}
    >
      <div
        onClick={onToggle}
        className="p-3.5 flex items-start justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 shrink-0">
            {isPass ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : isWarning ? (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-slate-900 dark:text-white">
                {test.name}
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-300">
                {method} {endpoint}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              {test.message || test.details}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {test.latencyMs !== undefined && (
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                test.latencyMs < 300
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : test.latencyMs < 800
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              }`}
            >
              {test.latencyMs} ms
            </span>
          )}

          {test.httpStatus && (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-gray-800 text-slate-700 dark:text-slate-300">
              {test.httpStatus}
            </span>
          )}

          {test.errorCode && test.errorCode !== "NONE_AUTHENTICATED" && (
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              {test.errorCode}
            </span>
          )}

          <div className="text-slate-400">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Expanded test details */}
      {isExpanded && (
        <div className="p-3.5 bg-slate-50 dark:bg-gray-950 border-t border-slate-200/60 dark:border-gray-800/80 text-xs space-y-3">
          {test.interpretation && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200">
              <p className="font-bold text-[11px]">Analysis & Interpretation:</p>
              <p className="mt-0.5 text-[11px] leading-relaxed">{test.interpretation}</p>
            </div>
          )}

          {test.remediation && (
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-800 dark:text-purple-200">
              <p className="font-bold text-[11px]">Recommended Remediation:</p>
              <p className="mt-0.5 text-[11px] leading-relaxed">{test.remediation}</p>
            </div>
          )}

          {test.authorizationUrl && (
            <div className="flex items-center gap-2">
              <a
                href={test.authorizationUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors shadow-xs shadow-purple-500/20"
              >
                <span>Open Generated Checkout Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <span className="text-[10px] text-slate-400 font-mono">
                Ref: {test.reference}
              </span>
            </div>
          )}

          {test.networkBreakdown && (
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(test.networkBreakdown).map(([net, cnt]) => (
                <div key={net} className="p-2 rounded-lg bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-center">
                  <div className="text-[10px] text-slate-400 font-bold">{net}</div>
                  <div className="text-xs font-black text-slate-800 dark:text-white">{String(cnt)} plans</div>
                </div>
              ))}
            </div>
          )}

          {test.raw && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Raw Gateway Response Payload
                </span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(test.raw, null, 2))}
                  className="text-[10px] text-purple-600 hover:text-purple-500 dark:text-purple-400 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-36">
                <pre>{JSON.stringify(test.raw, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Sub-component: Error Code Decoder Row
function DecoderRow({
  code,
  status,
  meaning,
  solution,
  color
}: {
  code: string;
  status: string;
  meaning: string;
  solution: string;
  color: "emerald" | "amber" | "rose" | "purple";
}) {
  const badgeColors = {
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500/20",
    rose: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    purple: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
  };

  return (
    <div className="p-3.5 sm:p-4 bg-white dark:bg-gray-900 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-mono text-xs font-black text-slate-900 dark:text-white">
          {code}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${badgeColors[color]}`}>
          {status}
        </span>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        {meaning}
      </p>
      <div className="p-2 rounded-lg bg-slate-50 dark:bg-gray-950 text-[11px] text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-gray-800 flex items-start gap-1.5">
        <ArrowRight className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Fix / Next Step: </span>
          <span>{solution}</span>
        </div>
      </div>
    </div>
  );
}
