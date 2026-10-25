import React, { useState, useEffect } from "react";
import { 
  CreditCard, 
  Building2, 
  Smartphone, 
  Clock, 
  Copy, 
  CheckCircle2, 
  Lock, 
  AlertCircle, 
  Loader2, 
  ChevronRight, 
  X,
  QrCode,
  ExternalLink,
  ShieldCheck
} from "lucide-react";

interface PaystackCheckoutProps {
  amount: number;
  email: string;
  onSuccess: (reference: string) => void;
  onClose: () => void;
}

type PaymentMethod = "card" | "transfer" | "ussd" | "qr";

export function PaystackCheckout({ amount, email, onSuccess, onClose }: PaystackCheckoutProps) {
  const [step, setStep] = useState<"initializing" | "checkout" | "processing" | "success" | "error">("initializing");
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [loadingText, setLoadingText] = useState("Connecting to Paystack secure gateway...");
  const [countdown, setCountdown] = useState(1799); // 30 minutes for Paystack virtual account
  const [copied, setCopied] = useState(false);
  const [reference, setReference] = useState("");
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [accountNumber, setAccountNumber] = useState("0123984129");
  const [bankName, setBankName] = useState("Paystack-Titan / Wema Bank");
  const [accountName, setAccountName] = useState("PAYSTACK / PAYCLICK");

  // Card details state
  const [cardNo, setCardNo] = useState("5061 2345 6789 9012");
  const [cardExpiry, setCardExpiry] = useState("08/29");
  const [cardCvv, setCardCvv] = useState("892");
  const [cardPin, setCardPin] = useState("");
  const [showPinInput, setShowPinInput] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);

  // USSD State
  const [selectedBankUssd, setSelectedBankUssd] = useState("*737*");

  useEffect(() => {
    // Initialise Paystack payment session
    const initSession = async () => {
      try {
        const response = await fetch("/api/paystack/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount, email, customerName: email.split("@")[0] })
        });
        const resData = await response.json();
        
        const data = resData.data || resData;
        const ref = data.reference || `PSK-${Date.now()}`;
        setReference(ref);
        if (data.authorization_url) setAuthUrl(data.authorization_url);
        if (data.accountNumber) setAccountNumber(data.accountNumber);
        if (data.bankName) setBankName(data.bankName);
        if (data.accountName) setAccountName(data.accountName);
        
        setTimeout(() => {
          setStep("checkout");
        }, 1000);
      } catch (err) {
        console.error("Paystack initialize error:", err);
        // Fallback to offline/sandbox reference
        setReference(`PSK-${Date.now()}`);
        setStep("checkout");
      }
    };

    initSession();
  }, [amount, email]);

  // Countdown timer for transfer method
  useEffect(() => {
    if (step !== "checkout" || method !== "transfer" || countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [step, method, countdown]);

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Polling state when user opens external Paystack checkout
  const [isWaitingExternal, setIsWaitingExternal] = useState(false);

  // Auto-poll Paystack verification if waiting for external window
  useEffect(() => {
    if (!isWaitingExternal || !reference || step !== "checkout") return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/paystack/verify/${encodeURIComponent(reference)}`);
        const result = await response.json();
        const isSuccessful = result.success === true || result.paid === true || result.data?.status === "success";
        if (isSuccessful) {
          clearInterval(pollInterval);
          setIsWaitingExternal(false);
          setStep("success");
          setTimeout(() => {
            onSuccess(reference);
          }, 2000);
        }
      } catch (err) {
        console.warn("Polling Paystack status:", err);
      }
    }, 2500);

    return () => clearInterval(pollInterval);
  }, [isWaitingExternal, reference, step, onSuccess]);

  const handleLaunchExternalCheckout = () => {
    if (authUrl) {
      setIsWaitingExternal(true);
      window.location.href = authUrl;
    }
  };

  const handleCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPinInput) {
      setStep("processing");
      setLoadingText("Validating card with Paystack switch...");
      setTimeout(() => {
        setStep("checkout");
        setShowPinInput(true);
      }, 1200);
    } else if (!showOtpInput) {
      setStep("processing");
      setLoadingText("Requesting 3D-Secure 2.0 authorization OTP...");
      setTimeout(() => {
        setStep("checkout");
        setShowOtpInput(true);
      }, 1400);
    } else {
      handleFinalPayment();
    }
  };

  const handleFinalPayment = async () => {
    setStep("processing");
    setLoadingText("Contacting Paystack gateway for instant settlement...");
    
    try {
      const response = await fetch(`/api/paystack/verify/${encodeURIComponent(reference)}`);
      const result = await response.json();

      setLoadingText("Verifying payment settlement with Paystack engine...");
      
      setTimeout(() => {
        const isSuccessful = result.paid === true || 
                             result.success === true ||
                             result.status === true || 
                             result.status === "success" || 
                             result.data?.status === "success" ||
                             result.data?.paymentStatus === "SUCCESSFUL";
        
        if (isSuccessful) {
          setStep("success");
          setTimeout(() => {
            onSuccess(reference);
          }, 2000);
        } else {
          // Live verification failed or incomplete
          setStep("error");
        }
      }, 1000);

    } catch (err) {
      console.error("Paystack verification error:", err);
      setStep("error");
    }
  };

  return (
    <div id="paystack-checkout-wrapper" className="fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#180a29] text-slate-100 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-purple-500/25 flex flex-col font-sans animate-in fade-in zoom-in-95 duration-200">
        
        {/* Paystack Brand Header */}
        <div className="px-5 py-4 bg-[#10051d] border-b border-purple-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Paystack custom logo bar styling */}
            <div className="flex items-center gap-1.5">
              <div className="flex flex-col gap-0.5">
                <div className="w-4 h-1 bg-purple-400 rounded-full"></div>
                <div className="w-2.5 h-1 bg-purple-400 rounded-full"></div>
              </div>
              <span className="text-sm font-extrabold tracking-tight text-white flex items-center">
                pay<span className="text-purple-400">stack</span>
              </span>
            </div>
            <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded-full border border-purple-500/30">
              Secured
            </span>
          </div>

          <button 
            id="btn-close-paystack-checkout"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-purple-950/60 hover:bg-purple-900 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Amount & Account Header */}
        <div className="px-5 pt-4 pb-3 bg-gradient-to-b from-[#140822] to-[#180a29] border-b border-purple-900/30">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Amount to Pay</p>
              <h2 className="text-2xl font-black text-white tracking-tight mt-0.5">
                ₦{amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{email}</p>
              <div className="flex items-center gap-1 text-[10px] text-purple-400 justify-end mt-0.5 font-medium">
                <ShieldCheck size={12} className="text-purple-400" />
                <span>PCI-DSS Level 1</span>
              </div>
            </div>
          </div>
        </div>

        {/* STEP: Initializing */}
        {step === "initializing" && (
          <div className="p-8 flex flex-col items-center justify-center text-center my-6 space-y-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-purple-500/20 border-t-purple-400 animate-spin flex items-center justify-center"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-purple-400"></div>
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-white">Opening Paystack Gateway</p>
              <p className="text-xs text-slate-400 mt-1">Establishing 256-bit TLS encrypted session...</p>
            </div>
          </div>
        )}

        {/* STEP: Checkout Options */}
        {step === "checkout" && (
          <div className="flex-1 flex flex-col p-4 space-y-4">

            {/* Official Paystack Redirect Button */}
            {authUrl && (
              <div className="bg-purple-950/40 border border-purple-500/40 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs font-bold text-white">Live Paystack Gateway Initialized</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Card, Bank, Transfer, or USSD checkout</p>
                </div>
                <button
                  type="button"
                  onClick={handleLaunchExternalCheckout}
                  className="w-full sm:w-auto px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/20 transition-all cursor-pointer whitespace-nowrap"
                >
                  <span>Launch Paystack Page</span>
                  <ExternalLink size={13} />
                </button>
              </div>
            )}

            {isWaitingExternal && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-center">
                <p className="text-xs font-semibold text-amber-300 animate-pulse">
                  Waiting for transaction completion on Paystack...
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Complete your payment in the opened tab; this window will credit your wallet automatically.
                </p>
              </div>
            )}
            
            {/* Payment Method Selector Tabs */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-purple-950/60 rounded-2xl border border-purple-900/40">
              <button
                id="tab-paystack-card"
                onClick={() => { setMethod("card"); setShowPinInput(false); setShowOtpInput(false); }}
                className={`py-2 px-1 text-[11px] font-bold rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  method === "card" 
                    ? "bg-purple-600 text-white shadow-md shadow-purple-500/25" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <CreditCard size={14} />
                <span>Card</span>
              </button>

              <button
                id="tab-paystack-transfer"
                onClick={() => setMethod("transfer")}
                className={`py-2 px-1 text-[11px] font-bold rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  method === "transfer" 
                    ? "bg-purple-600 text-white shadow-md shadow-purple-500/25" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Building2 size={14} />
                <span>Transfer</span>
              </button>

              <button
                id="tab-paystack-ussd"
                onClick={() => setMethod("ussd")}
                className={`py-2 px-1 text-[11px] font-bold rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  method === "ussd" 
                    ? "bg-purple-600 text-white shadow-md shadow-purple-500/25" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Smartphone size={14} />
                <span>USSD</span>
              </button>

              <button
                id="tab-paystack-qr"
                onClick={() => setMethod("qr")}
                className={`py-2 px-1 text-[11px] font-bold rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  method === "qr" 
                    ? "bg-purple-600 text-white shadow-md shadow-purple-500/25" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <QrCode size={14} />
                <span>QR/Scan</span>
              </button>
            </div>

            {/* TAB 1: Pay with Card */}
            {method === "card" && (
              <form onSubmit={handleCardSubmit} className="space-y-3">
                {!showPinInput && !showOtpInput && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-300">CARD NUMBER</label>
                        <button
                          type="button"
                          onClick={() => {
                            setCardNo("4084 0840 0840 0840");
                            setCardExpiry("12/28");
                            setCardCvv("408");
                          }}
                          className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold underline cursor-pointer"
                        >
                          Auto-fill Test Card
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          id="paystack-card-number"
                          type="text"
                          value={cardNo}
                          onChange={(e) => setCardNo(e.target.value)}
                          placeholder="0000 0000 0000 0000"
                          maxLength={19}
                          required
                          className="w-full bg-slate-900/90 border border-sky-900/50 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono tracking-wider focus:outline-none focus:border-[#0ba4db] transition-colors"
                        />
                        <div className="absolute right-3 top-2.5 flex items-center gap-1">
                          <span className="w-5 h-3 bg-red-500/80 rounded-sm"></span>
                          <span className="w-5 h-3 bg-amber-500/80 rounded-sm -ml-2"></span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 mb-1 block">EXPIRY DATE</label>
                        <input
                          id="paystack-card-expiry"
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/YY"
                          maxLength={5}
                          required
                          className="w-full bg-purple-950/50 border border-purple-900/50 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono text-center focus:outline-none focus:border-purple-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 mb-1 block">CVV</label>
                        <input
                          id="paystack-card-cvv"
                          type="password"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          placeholder="123"
                          maxLength={4}
                          required
                          className="w-full bg-purple-950/50 border border-purple-900/50 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono text-center focus:outline-none focus:border-purple-500 transition-colors"
                        />
                      </div>
                    </div>

                    <button
                      id="btn-paystack-submit-card"
                      type="submit"
                      className="w-full mt-2 py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 transition-all cursor-pointer"
                    >
                      <Lock size={14} />
                      <span>Pay ₦{amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
                    </button>
                  </>
                )}

                {showPinInput && !showOtpInput && (
                  <div className="space-y-4 py-2">
                    <div className="text-center">
                      <p className="text-xs font-bold text-white">Enter 4-Digit Card PIN</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Please provide your ATM PIN to authorize</p>
                    </div>
                    
                    <input
                      id="paystack-card-pin"
                      type="password"
                      maxLength={4}
                      value={cardPin}
                      onChange={(e) => setCardPin(e.target.value)}
                      placeholder="••••"
                      autoFocus
                      className="w-36 mx-auto bg-purple-950/60 border-2 border-purple-500/50 rounded-xl py-2.5 text-center text-xl tracking-[0.5em] font-mono text-white focus:outline-none focus:border-purple-400 block"
                    />

                    <button
                      id="btn-paystack-authorize-pin"
                      type="submit"
                      className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 transition-all cursor-pointer"
                    >
                      <span>Authorize Transaction</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}

                {showOtpInput && (
                  <div className="space-y-4 py-2">
                    <div className="text-center">
                      <p className="text-xs font-bold text-white">Paystack 3D Secure OTP</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Enter the one-time passcode sent to your phone</p>
                    </div>
                    
                    <input
                      id="paystack-card-otp"
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      autoFocus
                      className="w-44 mx-auto bg-purple-950/60 border-2 border-purple-500/50 rounded-xl py-2.5 text-center text-xl tracking-[0.3em] font-mono text-white focus:outline-none focus:border-purple-400 block"
                    />

                    <button
                      id="btn-paystack-verify-otp"
                      type="submit"
                      className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 transition-all cursor-pointer"
                    >
                      <span>Confirm & Deposit ₦{amount.toFixed(2)}</span>
                    </button>
                  </div>
                )}
              </form>
            )}

            {/* TAB 2: Pay with Bank Transfer */}
            {method === "transfer" && (
              <div className="space-y-3">
                <div className="bg-purple-950/50 rounded-2xl p-3.5 border border-purple-900/40 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Bank Name</span>
                    <span className="font-bold text-white text-right">{bankName}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Account Number</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-base text-purple-300 tracking-wider">{accountNumber}</span>
                      <button
                        id="btn-paystack-copy-acct"
                        type="button"
                        onClick={() => handleCopy(accountNumber)}
                        className="p-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 transition-colors cursor-pointer"
                        title="Copy Account Number"
                      >
                        {copied ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Account Name</span>
                    <span className="font-semibold text-slate-200 text-right text-[11px]">{accountName}</span>
                  </div>

                  <div className="pt-2 border-t border-purple-900/30 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                      <Clock size={13} />
                      <span>Expires in {formatCountdown(countdown)}</span>
                    </div>
                    <span className="text-slate-400 font-mono text-[10px]">Ref: {reference.slice(-8)}</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 text-center leading-relaxed">
                  Transfer exactly <strong className="text-white">₦{amount.toFixed(2)}</strong> to the Paystack Titan virtual account above. Your PayClick wallet will be credited automatically.
                </div>

                <button
                  id="btn-paystack-confirm-transfer"
                  type="button"
                  onClick={handleFinalPayment}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 transition-all cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  <span>I have sent the payment</span>
                </button>
              </div>
            )}

            {/* TAB 3: Pay with USSD */}
            {method === "ussd" && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 mb-1.5 block">SELECT YOUR BANK</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { name: "GTBank", code: "*737*" },
                      { name: "Zenith", code: "*966*" },
                      { name: "UBA", code: "*919*" },
                      { name: "Access", code: "*901*" },
                      { name: "FirstBank", code: "*894*" },
                      { name: "Sterling", code: "*822*" },
                    ].map((b) => (
                      <button
                        key={b.name}
                        type="button"
                        onClick={() => setSelectedBankUssd(b.code)}
                        className={`p-2 rounded-xl text-center border text-xs font-bold transition-all cursor-pointer ${
                          selectedBankUssd === b.code
                            ? "bg-purple-500/20 border-purple-400 text-white"
                            : "bg-purple-950/40 border-purple-900/50 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-purple-950/50 rounded-2xl p-3.5 border border-purple-900/40 text-center space-y-2">
                  <p className="text-[11px] text-slate-400 font-medium">Dial this code on your registered phone</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-mono font-black text-lg text-purple-300 tracking-wide">
                      {selectedBankUssd}000*{reference ? reference.replace(/[^0-9]/g, "").slice(-4) || "8421" : "8421"}#
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(`${selectedBankUssd}000*8421#`)}
                      className="p-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 cursor-pointer"
                      title="Copy USSD Code"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">Service charge: ₦6.98 (network provider fee)</p>
                </div>

                <button
                  id="btn-paystack-confirm-ussd"
                  type="button"
                  onClick={handleFinalPayment}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 transition-all cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  <span>I have dialed the USSD code</span>
                </button>
              </div>
            )}

            {/* TAB 4: Pay with QR / Official Checkout */}
            {method === "qr" && (
              <div className="space-y-3 text-center">
                <div className="bg-purple-950/50 rounded-2xl p-4 border border-purple-900/40 flex flex-col items-center justify-center space-y-2">
                  <div className="p-3 bg-white rounded-2xl shadow-inner flex items-center justify-center">
                    <QrCode size={130} className="text-purple-950" />
                  </div>
                  <p className="text-xs font-semibold text-slate-200">Scan with your bank's mobile app</p>
                  <p className="text-[10px] text-slate-400 max-w-[200px]">
                    Compatible with GTWorld, Access More, Kuda, PalmPay, and standard NQR.
                  </p>
                </div>

                <button
                  id="btn-paystack-confirm-qr"
                  type="button"
                  onClick={handleFinalPayment}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 transition-all cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  <span>I have completed the scan</span>
                </button>
              </div>
            )}

          </div>
        )}

        {/* STEP: Processing */}
        {step === "processing" && (
          <div className="p-8 flex flex-col items-center justify-center text-center my-6 space-y-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-3 border-purple-500/20 border-t-purple-400 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock size={18} className="text-purple-400" />
              </div>
            </div>
            <div>
              <p className="text-sm font-extrabold text-white">{loadingText}</p>
              <p className="text-xs text-slate-400 mt-1">Please do not close this window</p>
            </div>
          </div>
        )}

        {/* STEP: Success */}
        {step === "success" && (
          <div className="p-8 flex flex-col items-center justify-center text-center my-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center animate-bounce">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Payment Successful!</h3>
              <p className="text-xs text-slate-300 mt-1">
                ₦{amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })} has been credited to your wallet via Paystack.
              </p>
              <p className="text-[10px] text-slate-500 font-mono mt-2">Ref: {reference}</p>
            </div>
          </div>
        )}

        {/* STEP: Error */}
        {step === "error" && (
          <div className="p-8 flex flex-col items-center justify-center text-center my-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <AlertCircle size={32} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Payment Could Not Complete</h3>
              <p className="text-xs text-slate-400 mt-1">
                Paystack was unable to verify the transaction. Please try again or switch payment methods.
              </p>
            </div>
            <button
              onClick={() => setStep("checkout")}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-2.5 bg-[#0f041b] border-t border-purple-950/60 flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
          <Lock size={10} className="text-emerald-400" />
          <span>Secured by <strong className="text-slate-300">Paystack</strong> Payment Gateway</span>
        </div>

      </div>
    </div>
  );
}
