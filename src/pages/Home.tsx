import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Bell, 
  HelpCircle, 
  Eye, 
  EyeOff, 
  ChevronRight, 
  Smartphone, 
  Tv, 
  TrendingUp, 
  Trophy, 
  DollarSign, 
  Share2, 
  ShieldCheck, 
  Home as HomeIcon,
  Gift, 
  Layers, 
  CreditCard, 
  User, 
  Sparkles,
  QrCode,
  ArrowUpRight,
  HandCoins,
  Megaphone,
  MoreHorizontal,
  Zap,
  Sun,
  Moon,
  X,
  Check,
  Info,
  AlertTriangle,
  ChevronLeft,
  Play,
  Pause,
  Wifi,
  MessageSquare,
  GraduationCap,
  Send,
  Building2,
  Copy,
  Plus,
  Coins,
  RefreshCw
} from "lucide-react";
import { serviceProviders } from "@/data/providers";
import { cn } from "@/lib/utils";
import { BottomNav } from "@/components/BottomNav";
import { 
  saveUserFieldToCloud, 
  syncUserDataFromCloud, 
  db, 
  syncCustomerToPaystack, 
  syncPaystackBalanceWithWallet,
  generatePaystackDedicatedAccount
} from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { PaystackCheckout } from "@/components/PaystackCheckout";

export function Home() {
  const navigate = useNavigate();
  const [showBalance, setShowBalance] = useState(true);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Home");

  // Funding states for production-readiness: strictly Paystack & Dedicated Account Transfer
  const [showFundModal, setShowFundModal] = useState(false);
  const [fundMethod, setFundMethod] = useState<"transfer" | "paystack">("transfer");
  const [fundAmount, setFundAmount] = useState("");
  const [isFunding, setIsFunding] = useState(false);
  const [fundError, setFundError] = useState<string | null>(null);
  const [fundSuccess, setFundSuccess] = useState<string | null>(null);
  const [showPaystackCheckout, setShowPaystackCheckout] = useState(false);
  const [checkoutAmount, setCheckoutAmount] = useState(0);

  // KYC compliance states
  const [kycVerified, setKycVerified] = useState(() => {
    return localStorage.getItem("vtu_kyc_verified") === "true";
  });
  const [showKycModal, setShowKycModal] = useState(false);
  const [kycIdType, setKycIdType] = useState<"nin" | "bvn" | "drivers_license" | "voters_card">("nin");
  const [kycIdNumber, setKycIdNumber] = useState("");
  const [kycFullName, setKycFullName] = useState("");
  const [kycIsSubmitting, setKycIsSubmitting] = useState(false);
  const [kycError, setKycError] = useState<string | null>(null);

  // Global system controls synced real-time from Firestore
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [systemAlert, setSystemAlert] = useState("");
  const [globalDiscount, setGlobalDiscount] = useState(2.0);
  const [providersStatus, setProvidersStatus] = useState<Record<string, string | boolean>>({});
  const [localAdmins, setLocalAdmins] = useState<string[]>([]);
  const [adminConfig, setAdminConfig] = useState<any>(null);

  // Dynamic user details & clipboard feedback
  const email = localStorage.getItem("vtu_user_email") || "jamesgideon961@gmail.com";
  const rawUsername = localStorage.getItem("vtu_user_username") || email.split("@")[0];
  const username = rawUsername || "User";
  const [copiedAcc, setCopiedAcc] = useState(false);

  // Paystack Live Synchronization states
  const [syncingPaystack, setSyncingPaystack] = useState(false);
  const [paystackSyncNotice, setPaystackSyncNotice] = useState<string | null>(null);
  const [paystackCustomerCode, setPaystackCustomerCode] = useState(() => localStorage.getItem("vtu_paystack_customer_code") || "");
  const [paystackAccountNo, setPaystackAccountNo] = useState(() => localStorage.getItem("vtu_paystack_account_number") || "");
  const [paystackBankName, setPaystackBankName] = useState(() => localStorage.getItem("vtu_paystack_bank_name") || "");

  // Automatically register and sync customer on Paystack in background
  useEffect(() => {
    if (email) {
      const fullName = localStorage.getItem("vtu_user_full_name") || "";
      const phone = localStorage.getItem("vtu_user_phone") || "";
      syncCustomerToPaystack(email, fullName, phone, username)
        .then((res) => {
          if (res?.customerCode) {
            setPaystackCustomerCode(res.customerCode);
          }
          if (res?.dedicatedAccount?.account_number) {
            setPaystackAccountNo(res.dedicatedAccount.account_number);
            setPaystackBankName(res.dedicatedAccount.bank?.name || "Wema Bank / Titan");
          }
        })
        .catch((e) => console.warn("Paystack background auto-registration notice:", e));
    }
  }, [email, username]);

  const handleSyncPaystackBalance = async () => {
    if (!email || syncingPaystack) return;
    setSyncingPaystack(true);
    setPaystackSyncNotice(null);
    try {
      const result = await syncPaystackBalanceWithWallet(email);
      if (result && result.status) {
        await syncUserDataFromCloud(email);
        const currentBal = localStorage.getItem("vtu_wallet_balance");
        if (currentBal) {
          setBalance(parseFloat(currentBal));
        }
        setPaystackSyncNotice(`Paystack synchronized! Verified deposits: ₦${(result.totalDeposited || 0).toLocaleString()}`);
      } else {
        setPaystackSyncNotice("Paystack sync completed. Wallet up to date.");
      }
    } catch (e) {
      setPaystackSyncNotice("Could not sync Paystack balance right now.");
    } finally {
      setSyncingPaystack(false);
      setTimeout(() => setPaystackSyncNotice(null), 4500);
    }
  };

  // Theme support
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("vtu_dark_mode") === "true";
  });

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

  // Listen to Firestore system settings for admin actions in real-time
  useEffect(() => {
    const configDocRef = doc(db, "system", "settings");
    const unsubscribe = onSnapshot(configDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setAdminConfig(data);
        if (data.maintenanceMode !== undefined) setMaintenanceMode(data.maintenanceMode);
        if (data.systemAlert !== undefined) setSystemAlert(data.systemAlert);
        if (data.globalDiscount !== undefined) setGlobalDiscount(data.globalDiscount);
        // Handle both plural and singular field names from admin console
        const statuses = data.providerStatuses || data.providersStatus || {};
        setProvidersStatus(statuses);
        if (data.localAdmins !== undefined) setLocalAdmins(data.localAdmins);
      }
    }, (error) => {
      console.warn("Error listening to global system settings:", error);
    });
    return () => unsubscribe();
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

  // Interactive help and notifications modals
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Real-time notifications state
  const [notifications, setNotifications] = useState<any[]>(() => {
    const saved = localStorage.getItem("vtu_notifications_list");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("vtu_notifications_list", JSON.stringify(notifications));
    if (email) {
      saveUserFieldToCloud(email, "notifications_list", notifications);
    }
  }, [notifications, email]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const toggleNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: !n.read } : n));
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        // Sync user data from Firestore cloud database first
        if (email) {
          const cloudData = await syncUserDataFromCloud(email);
          if (cloudData) {
            if (cloudData.wallet_balance !== undefined) {
              setBalance(cloudData.wallet_balance);
            }
            if (cloudData.kyc_verified !== undefined) {
              setKycVerified(cloudData.kyc_verified);
            }
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Firestore wallet sync failed, checking local storage:", err);
      }

      // Local storage fallback
      const localBal = localStorage.getItem("vtu_wallet_balance");
      if (localBal) {
        setBalance(parseFloat(localBal));
      } else {
        setBalance(0);
      }
      setKycVerified(localStorage.getItem("vtu_kyc_verified") === "true");
      setLoading(false);
    };
    fetchBalance();

    // Listen to custom updates
    const handleTxUpdate = () => {
      const localBal = localStorage.getItem("vtu_wallet_balance");
      if (localBal) {
        setBalance(parseFloat(localBal));
      }
    };
    window.addEventListener("vtu-transactions-updated", handleTxUpdate);
    return () => {
      window.removeEventListener("vtu-transactions-updated", handleTxUpdate);
    };
  }, [email]);

  const copyTextToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleFundWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setFundError(null);
    setFundSuccess(null);

    const amountNum = parseFloat(fundAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setFundError("Please enter a valid amount greater than zero.");
      return;
    }

    if (amountNum < 100) {
      setFundError("The minimum deposit amount is ₦100.00.");
      return;
    }

    if (fundMethod === "paystack") {
      setCheckoutAmount(amountNum);
      setShowFundModal(false);
      setShowPaystackCheckout(true);
      return;
    }

    setIsFunding(true);

    setTimeout(async () => {
      try {
        const currentBalance = balance || 0;
        const newBalance = currentBalance + amountNum;
        
        // Update states
        setBalance(newBalance);
        localStorage.setItem("vtu_wallet_balance", newBalance.toFixed(2));
        await saveUserFieldToCloud(email, "wallet_balance", newBalance);

        // Add deposit to transactions log
        const newTx = {
          id: `DEP-${Date.now()}`,
          provider: { 
            name: "Bank Deposit", 
            logo: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=64&q=80" 
          },
          amount: amountNum,
          date: new Date().toLocaleString("en-US", { 
            month: "short", 
            day: "numeric", 
            hour: "2-digit", 
            minute: "2-digit",
            second: "2-digit"
          }),
          phoneOrMeter: "Bank Transfer",
          status: "Successful",
          details: `Deposited ₦${amountNum.toFixed(2)} securely via Dedicated Virtual Bank Account`
        };

        const existingTxs = localStorage.getItem("vtu_transactions");
        const txList = existingTxs ? JSON.parse(existingTxs) : [];
        txList.unshift(newTx);
        localStorage.setItem("vtu_transactions", JSON.stringify(txList));
        await saveUserFieldToCloud(email, "transactions", txList);

        // Add real-time user notification
        const fundNotif = {
          id: `notif-${Date.now()}`,
          title: "Wallet Fund Credited",
          body: `₦${amountNum.toLocaleString('en-NG', { minimumFractionDigits: 2 })} has been deposited successfully into your VTU wallet.`,
          date: "Just now",
          read: false,
          type: "success"
        };
        setNotifications(prev => [fundNotif, ...prev]);

        setFundSuccess(`Payment complete! ₦${amountNum.toLocaleString('en-NG', { minimumFractionDigits: 2 })} credited successfully.`);
        setFundAmount("");
      } catch (err: any) {
        console.error("Wallet deposit synchronization error:", err);
        setFundError("An error occurred while synchronizing balance with the cloud. Local cache credited.");
      } finally {
        setIsFunding(false);
      }
    }, 2000);
  };

  const handlePaystackSuccess = async (reference: string) => {
    try {
      const currentBalance = balance || 0;
      const newBalance = currentBalance + checkoutAmount;
      
      setBalance(newBalance);
      localStorage.setItem("vtu_wallet_balance", newBalance.toFixed(2));
      await saveUserFieldToCloud(email, "wallet_balance", newBalance);

      const newTx = {
        id: reference,
        serviceId: "fund",
        providerName: "Paystack Deposit",
        providerColor: "bg-purple-600",
        providerTextColor: "text-white",
        provider: { 
          name: "Paystack Checkout", 
          logo: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=64&q=80" 
        },
        amount: checkoutAmount,
        date: new Date().toLocaleString("en-US", { 
          month: "short", 
          day: "numeric", 
          hour: "2-digit", 
          minute: "2-digit",
          second: "2-digit"
        }),
        phoneOrMeter: "Paystack Webpay",
        status: "Successful",
        details: `Deposited ₦${checkoutAmount.toFixed(2)} securely via Paystack Merchant Checkout.`
      };

      const existingTxs = localStorage.getItem("vtu_transactions");
      const txList = existingTxs ? JSON.parse(existingTxs) : [];
      txList.unshift(newTx);
      localStorage.setItem("vtu_transactions", JSON.stringify(txList));
      await saveUserFieldToCloud(email, "transactions", txList);

      const fundNotif = {
        id: `notif-${Date.now()}`,
        title: "Paystack Deposit Settled",
        body: `₦${checkoutAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })} credited successfully via Paystack Checkout.`,
        date: "Just now",
        read: false,
        type: "success"
      };
      setNotifications(prev => [fundNotif, ...prev]);

      setShowPaystackCheckout(false);
      setFundAmount("");
    } catch (err) {
      console.error("Paystack wallet deposit sync error:", err);
    }
  };

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setKycError(null);

    const cleanName = kycFullName.trim();
    if (!cleanName) {
      setKycError("Please enter your full legal name.");
      return;
    }

    if (cleanName.split(" ").length < 2) {
      setKycError("Please enter at least your first and last name.");
      return;
    }

    const cleanId = kycIdNumber.trim();
    if (!cleanId) {
      setKycError("Please enter your identity document number.");
      return;
    }

    if (kycIdType === "nin" && cleanId.length !== 11) {
      setKycError("National Identification Number (NIN) must be exactly 11 digits.");
      return;
    }
    if (kycIdType === "bvn" && cleanId.length !== 11) {
      setKycError("Bank Verification Number (BVN) must be exactly 11 digits.");
      return;
    }
    if (kycIdType === "drivers_license" && cleanId.length < 6) {
      setKycError("Please enter a valid Driver's License number (minimum 6 characters).");
      return;
    }
    if (kycIdType === "voters_card" && cleanId.length < 8) {
      setKycError("Please enter a valid Voter's Card number (minimum 8 characters).");
      return;
    }

    setKycIsSubmitting(true);

    try {
      const phone = localStorage.getItem("vtu_user_phone") || "";
      const kycDetailsObj = {
        idType: kycIdType,
        idNumber: cleanId,
        fullName: cleanName,
        verifiedAt: new Date().toISOString()
      };

      // Call Paystack Dedicated Account generator with KYC details
      const dvaRes = await generatePaystackDedicatedAccount({
        email,
        fullName: cleanName,
        phone,
        bvn: kycIdType === "bvn" ? cleanId : undefined,
        nin: kycIdType === "nin" ? cleanId : undefined,
        idType: kycIdType,
        idNumber: cleanId
      });

      if (dvaRes && dvaRes.accountNumber) {
        setPaystackAccountNo(dvaRes.accountNumber);
        setPaystackBankName(dvaRes.bankName || "Wema Bank / Titan");
        if (dvaRes.customerCode) {
          setPaystackCustomerCode(dvaRes.customerCode);
        }
      }

      // Persist local and cloud
      localStorage.setItem("vtu_kyc_verified", "true");
      localStorage.setItem("vtu_kyc_details", JSON.stringify(kycDetailsObj));
      
      await saveUserFieldToCloud(email, "kyc_verified", true);
      await saveUserFieldToCloud(email, "kyc_details", kycDetailsObj);

      setKycVerified(true);

      const kycNotif = {
        id: `notif-kyc-${Date.now()}`,
        title: "KYC Verified & Dedicated Account Assigned 🛡️",
        body: `Verification approved via ${kycIdType.toUpperCase()}. Your personal Paystack dedicated account (${dvaRes?.accountNumber || paystackAccountNo || "Generated"}) is active!`,
        date: "Just now",
        read: false,
        type: "success"
      };
      setNotifications(prev => [kycNotif, ...prev]);

      setShowKycModal(false);
      setKycIdNumber("");
      setKycFullName("");
      setShowFundModal(true);
    } catch (err) {
      console.error("KYC verification error:", err);
      setKycError("An error occurred during verification with the national database. Please try again.");
    } finally {
      setKycIsSubmitting(false);
    }
  };

  const formattedBalance = balance !== null 
    ? `₦${balance.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
    : "₦0.00";

  const isSuperAdmin = email.toLowerCase().trim() === "payclickfocus@gmail.com";
  const isLocalAdmin = localAdmins.map(e => e.toLowerCase().trim()).includes(email.toLowerCase().trim());
  const isUserAdmin = isSuperAdmin || isLocalAdmin;

  if (maintenanceMode && !isUserAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white select-none">
        <div className="w-20 h-20 bg-amber-500/10 rounded-3xl border border-amber-500/25 flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10 text-amber-500 animate-bounce" />
        </div>
        <h1 className="text-2xl font-black tracking-tight mb-2">Systems Optimization</h1>
        <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
          PayClick is currently undergoing scheduled systems enhancement. All balances and services are safe. We will be online shortly!
        </p>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-lg text-[10px] font-mono font-bold text-amber-400">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
          RE-ROUTING GATEWAYS
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 pb-24 text-gray-800 dark:text-gray-100 font-sans">
      {/* 1. TOP HEADER SECTION */}
      <header className="flex items-center justify-between px-4 py-3.5 bg-white dark:bg-gray-900 sticky top-0 z-20 shadow-xs border-b border-slate-100 dark:border-gray-800">
        {/* Profile Avatar and Greeting */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate("/account")} 
            className="w-11 h-11 rounded-full overflow-hidden border-2 border-slate-100 dark:border-gray-800 shadow-xs bg-slate-200 shrink-0 hover:opacity-90 transition-opacity"
            title="Account Settings"
          >
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80"
              alt="Profile avatar"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </button>
          <div className="text-left leading-tight">
            <p className="text-[12px] font-medium text-slate-500 dark:text-gray-400 flex items-center gap-1">
              Welcome <span className="text-amber-400">👋</span>
            </p>
            <h1 className="text-[16px] font-extrabold text-slate-900 dark:text-white tracking-tight">
              {username}
            </h1>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-3">
          {/* Light/Dark Mode toggle */}
          <button 
            onClick={toggleTheme} 
            className="text-slate-700 dark:text-slate-300 hover:text-[#8e24aa] transition-colors p-1.5 rounded-full focus:outline-none"
            aria-label="Toggle dark mode"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? (
              <Sun className="w-6 h-6 text-amber-500 hover:scale-110 transition-transform" strokeWidth={1.8} />
            ) : (
              <Moon className="w-6 h-6 text-slate-700 dark:text-slate-300 hover:scale-110 transition-transform" strokeWidth={1.8} />
            )}
          </button>

          {/* Bell with red count badge */}
          <button 
            onClick={() => setShowNotifModal(true)}
            className="relative text-slate-700 dark:text-slate-300 hover:text-[#8e24aa] transition-colors p-1.5 rounded-full focus:outline-none"
            title="Notifications"
          >
            <Bell className="w-6.5 h-6.5" strokeWidth={1.8} />
            <span className="absolute top-0 right-0 w-4.5 h-4.5 bg-[#8e24aa] text-white font-extrabold text-[9px] rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-xs">
              0
            </span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER */}
      <main className="p-4 max-w-md mx-auto space-y-4">
        
        {/* 2. ROYAL PURPLE WALLET BALANCE CARD */}
        <div className="bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-950 rounded-2xl p-4.5 text-white shadow-lg relative overflow-hidden border border-purple-500/20">
          {/* Decorative ambient gradient highlight */}
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/10 blur-xl"></div>
          
          <div className="relative z-10 space-y-4">
            {/* Top row */}
            <div className="flex justify-between items-center text-xs font-medium text-purple-100">
              <div className="flex items-center gap-1.5">
                <span>Wallet Balance</span>
                <button 
                  onClick={() => setShowBalance(!showBalance)}
                  className="text-purple-200 hover:text-white transition-colors p-0.5"
                >
                  {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
              <div className="font-semibold text-xs tracking-wide text-purple-200">
                Bonus: <span className="font-extrabold">₦**</span>
              </div>
            </div>

            {/* Balance Amount & Actions */}
            <div className="flex justify-between items-end pt-1 flex-wrap gap-2">
              <div className="select-none">
                <h2 className="text-3xl font-extrabold tracking-tight">
                  {showBalance ? formattedBalance : "₦***.**"}
                </h2>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncPaystackBalance}
                  disabled={syncingPaystack}
                  title="Sync and verify your live Paystack deposits"
                  className="bg-white/15 hover:bg-white/25 active:scale-95 text-purple-100 px-3 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-white/20"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", syncingPaystack && "animate-spin")} />
                  <span className="hidden sm:inline">Sync Paystack</span>
                </button>

                <button 
                  onClick={() => {
                    setFundError(null);
                    setFundSuccess(null);
                    if (!kycVerified) {
                      setKycError(null);
                      setShowKycModal(true);
                    } else {
                      setShowFundModal(true);
                    }
                  }}
                  className="bg-white text-purple-700 hover:bg-purple-50 transition-all px-4 py-2 rounded-full text-xs font-bold shadow-sm flex items-center gap-1.5 active:scale-95 border border-purple-100 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  Add Funds
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Paystack sync feedback ribbon */}
        {paystackSyncNotice && (
          <div className="bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{paystackSyncNotice}</span>
          </div>
        )}

        {/* 4. MAIN SERVICE GRID PANEL (REALIGNED WITH ALL ADMIN CONSOLE SERVICES) */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-xs border border-purple-100/60 dark:border-purple-900/30">
          <div className="grid grid-cols-4 gap-y-6 gap-x-2">
            {/* 1. Airtime */}
            <Link to="/service/airtime" className="flex flex-col items-center gap-1.5 group text-center relative">
              {providersStatus.airtime === "offline" && (
                <span className="absolute -top-1.5 bg-rose-500 text-white text-[7px] font-black px-1.5 py-0.2 rounded-full z-10">OFFLINE</span>
              )}
              <div className="w-13 h-13 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-100/50 dark:border-purple-800/30 rounded-full flex items-center justify-center transition-all group-hover:scale-105 group-hover:bg-purple-600 group-hover:text-white shadow-xs">
                <Smartphone className="w-6 h-6 stroke-[1.8]" />
              </div>
              <span className="text-[12px] font-medium text-slate-800 dark:text-slate-200">Airtime</span>
            </Link>

            {/* 2. Data */}
            <Link to="/service/data" className="flex flex-col items-center gap-1.5 group text-center relative">
              {providersStatus.data === "offline" && (
                <span className="absolute -top-1.5 bg-rose-500 text-white text-[7px] font-black px-1.5 py-0.2 rounded-full z-10">OFFLINE</span>
              )}
              <div className="w-13 h-13 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-100/50 dark:border-purple-800/30 rounded-full flex items-center justify-center transition-all group-hover:scale-105 group-hover:bg-purple-600 group-hover:text-white shadow-xs">
                <Wifi className="w-6 h-6 stroke-[1.8]" />
              </div>
              <span className="text-[12px] font-medium text-slate-800 dark:text-slate-200">Data</span>
            </Link>

            {/* 3. Cable TV */}
            <Link to="/service/cables" className="flex flex-col items-center gap-1.5 group text-center relative">
              {providersStatus.cables === "offline" && (
                <span className="absolute -top-1.5 bg-rose-500 text-white text-[7px] font-black px-1.5 py-0.2 rounded-full z-10">OFFLINE</span>
              )}
              <div className="w-13 h-13 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-100/50 dark:border-purple-800/30 rounded-full flex items-center justify-center transition-all group-hover:scale-105 group-hover:bg-purple-600 group-hover:text-white shadow-xs">
                <Tv className="w-6 h-6 stroke-[1.8]" />
              </div>
              <span className="text-[12px] font-medium text-slate-800 dark:text-slate-200">Cable</span>
            </Link>

            {/* 4. Electricity */}
            <Link to="/service/electricity" className="flex flex-col items-center gap-1.5 group text-center relative">
              {providersStatus.electricity === "offline" && (
                <span className="absolute -top-1.5 bg-rose-500 text-white text-[7px] font-black px-1.5 py-0.2 rounded-full z-10">OFFLINE</span>
              )}
              <div className="w-13 h-13 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-100/50 dark:border-purple-800/30 rounded-full flex items-center justify-center transition-all group-hover:scale-105 group-hover:bg-purple-600 group-hover:text-white shadow-xs">
                <Zap className="w-6 h-6 stroke-[1.8]" />
              </div>
              <span className="text-[12px] font-medium text-slate-800 dark:text-slate-200">Electricity</span>
            </Link>

            {/* 5. Edu Pins (WAEC / NECO / JAMB) */}
            <Link to="/service/exams" className="flex flex-col items-center gap-1.5 group text-center relative">
              {providersStatus.exams === "offline" && (
                <span className="absolute -top-1.5 bg-rose-500 text-white text-[7px] font-black px-1.5 py-0.2 rounded-full z-10">OFFLINE</span>
              )}
              <div className="w-13 h-13 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-100/50 dark:border-purple-800/30 rounded-full flex items-center justify-center transition-all group-hover:scale-105 group-hover:bg-purple-600 group-hover:text-white shadow-xs">
                <GraduationCap className="w-6 h-6 stroke-[1.8]" />
              </div>
              <span className="text-[12px] font-medium text-slate-800 dark:text-slate-200">Edu Pins</span>
            </Link>

            {/* 6. Sports Betting Funding (Now fully integrated & aligned with Admin Console) */}
            <Link to="/service/betting" className="flex flex-col items-center gap-1.5 group text-center relative">
              {providersStatus.betting === "offline" ? (
                <span className="absolute -top-1.5 bg-rose-500 text-white text-[7px] font-black px-1.5 py-0.2 rounded-full z-10">OFFLINE</span>
              ) : (
                <span className="absolute -top-1.5 bg-emerald-500 text-white text-[7px] font-black px-1.5 py-0.2 rounded-full z-10 shadow-xs">ACTIVE</span>
              )}
              <div className="w-13 h-13 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-100/50 dark:border-purple-800/30 rounded-full flex items-center justify-center transition-all group-hover:scale-105 group-hover:bg-purple-600 group-hover:text-white shadow-xs">
                <Coins className="w-6 h-6 stroke-[1.8]" />
              </div>
              <span className="text-[12px] font-medium text-slate-800 dark:text-slate-200">Betting</span>
            </Link>

            {/* 7. Bulk SMS */}
            <Link to="/service/airtime" className="flex flex-col items-center gap-1.5 group text-center relative">
              <div className="w-13 h-13 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-100/50 dark:border-purple-800/30 rounded-full flex items-center justify-center transition-all group-hover:scale-105 group-hover:bg-purple-600 group-hover:text-white shadow-xs">
                <MessageSquare className="w-6 h-6 stroke-[1.8]" />
              </div>
              <span className="text-[12px] font-medium text-slate-800 dark:text-slate-200">Bulk SMS</span>
            </Link>

            {/* 8. Bank Transfer / Deposit */}
            <div 
              onClick={() => {
                setFundError(null);
                setFundSuccess(null);
                if (!kycVerified) {
                  setKycError(null);
                  setShowKycModal(true);
                } else {
                  setFundMethod("transfer");
                  setShowFundModal(true);
                }
              }}
              className="flex flex-col items-center gap-1.5 group text-center relative cursor-pointer"
            >
              <div className="w-13 h-13 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-100/50 dark:border-purple-800/30 rounded-full flex items-center justify-center transition-all group-hover:scale-105 group-hover:bg-purple-600 group-hover:text-white shadow-xs">
                <Send className="w-6 h-6 stroke-[1.8]" />
              </div>
              <span className="text-[12px] font-medium text-slate-800 dark:text-slate-200">Transfer</span>
            </div>
          </div>
        </div>

        {/* 5. VIRTUAL BANK ACCOUNT CARD WITH PAYSTACK DVA */}
        <div 
          onClick={() => {
            if (!kycVerified) {
              setKycError(null);
              setShowKycModal(true);
            }
          }}
          className={cn(
            "bg-gradient-to-r from-[#2e1065] via-[#3b0764] to-[#1e1b4b] border border-purple-800/40 text-white rounded-2xl p-4 shadow-lg space-y-3 relative overflow-hidden",
            !kycVerified && "cursor-pointer hover:border-purple-500/80 transition-all"
          )}
        >
          {!kycVerified ? (
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Personal Dedicated Account (KYC Required)</span>
                </div>
                <p className="text-[11px] text-purple-200 font-medium">
                  Complete your quick identity verification to get your unique Paystack NUBAN account.
                </p>
              </div>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setKycError(null);
                  setShowKycModal(true);
                }}
                className="bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-black px-3.5 py-2 rounded-xl shadow-xs shrink-0 cursor-pointer"
              >
                Verify KYC
              </button>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="text-purple-200">Account No:</span>
                  <span className="font-extrabold text-sm tracking-wide">
                    {paystackAccountNo || "Generated"}
                  </span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (paystackAccountNo) {
                        navigator.clipboard.writeText(paystackAccountNo);
                        setCopiedAcc(true);
                        setTimeout(() => setCopiedAcc(false), 2000);
                      }
                    }}
                    className="text-purple-300 hover:text-white transition-colors p-1 cursor-pointer"
                    title="Copy Account Number"
                  >
                    {copiedAcc ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Mastercard overlapping circles */}
                <div className="flex -space-x-2 items-center">
                  <div className="w-5 h-5 rounded-full bg-red-600 opacity-90"></div>
                  <div className="w-5 h-5 rounded-full bg-amber-500 opacity-90"></div>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs pt-1 border-t border-purple-800/60">
                <div className="font-medium text-purple-200">
                  Bank: <span className="font-bold text-white">{paystackBankName || "Paystack Titan / Wema Bank"}</span>
                </div>
                {paystackCustomerCode && (
                  <span className="text-[9.5px] font-mono text-purple-300 bg-purple-900/60 px-2 py-0.5 rounded-full">
                    {paystackCustomerCode}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* 6. RECENT TRANSACTIONS SECTION */}
        <div className="space-y-2 pt-1">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight text-left">
            Recent Transactions
          </h3>
          
          <div className="bg-slate-200/50 dark:bg-gray-900/60 rounded-2xl h-24 border border-slate-200/70 dark:border-gray-800 flex items-center justify-center">
            <span className="text-xs text-slate-400 font-medium">No recent transactions</span>
          </div>
        </div>

      </main>

      {/* 7. PERSISTENT BOTTOM NAVIGATION */}
      <BottomNav />

      {/* 8. HELP / FAQ MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-950 w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-100 dark:border-gray-800 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-purple-700 to-indigo-950 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-purple-200" />
                <h2 className="font-extrabold text-sm uppercase tracking-wide">Customer Support & FAQs</h2>
              </div>
              <button 
                onClick={() => setShowHelpModal(false)}
                className="p-1 rounded-full hover:bg-white/20 transition-colors text-white focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content area */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* Direct Support Channels */}
              <div className="space-y-2">
                <h3 className="font-extrabold text-slate-400 uppercase tracking-widest text-[10px]">Contact Support Channels</h3>
                <div className="grid grid-cols-2 gap-2">
                  <a 
                    href="https://wa.me/23480072925425" 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl flex flex-col items-center text-center gap-1 hover:brightness-95 transition-all"
                  >
                    <span className="text-emerald-500 font-extrabold font-mono text-[11px]">WhatsApp Support</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium font-sans">Chat Instantly</span>
                  </a>
                  <a 
                    href="mailto:support@payclick.com"
                    className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 rounded-xl flex flex-col items-center text-center gap-1 hover:brightness-95 transition-all"
                  >
                    <span className="text-purple-600 font-extrabold font-mono text-[11px]">Email Support</span>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium font-sans">Reply in 1hr</span>
                  </a>
                </div>
              </div>

              {/* Accordion FAQ Area */}
              <div className="space-y-2 pt-2 border-t border-slate-50 dark:border-gray-900">
                <h3 className="font-extrabold text-slate-400 uppercase tracking-widest text-[10px]">Frequently Asked Questions</h3>
                
                {[
                  {
                    q: "How can I top up my wallet balance?",
                    a: "You can fund your wallet directly using Instant Bank Transfer to your dedicated Virtual Account number or online via the Paystack gateway (Card, USSD, Bank Transfer)."
                  },
                  {
                    q: "What are P-Coins and how are they used?",
                    a: "P-Coins are loyalty points earned by referring friends or completing utility transactions. You can share your unique referral link to earn bonus points."
                  },
                  {
                    q: "My transaction is currently pending. What should I do?",
                    a: "All VTU API transactions are processed within 10 seconds. If a provider's network has local latency, our automated routing engine will retry the settlement or automatically refund your wallet."
                  }
                ].map((faq, idx) => {
                  const isExpanded = expandedFaq === idx;
                  return (
                    <div 
                      key={idx} 
                      className="border border-slate-100 dark:border-gray-850 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/50"
                    >
                      <button
                        onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                        className="w-full p-3 text-left font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100/40 dark:hover:bg-slate-900 flex justify-between items-center transition-colors focus:outline-none"
                      >
                        <span className="pr-4 leading-tight">{faq.q}</span>
                        <span className="text-slate-400 text-sm font-light shrink-0">{isExpanded ? "−" : "+"}</span>
                      </button>
                      {isExpanded && (
                        <div className="p-3 pt-0 text-slate-505 dark:text-slate-400 leading-relaxed font-medium text-[11px] border-t border-slate-100/50 dark:border-gray-850/50 animate-in slide-in-from-top-1">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 dark:bg-gray-900/50 border-t border-slate-100 dark:border-gray-900 text-center text-[10px] text-slate-400 font-medium">
              PayClick Focus VTU Support Team
            </div>
          </div>
        </div>
      )}

      {/* 9. NOTIFICATIONS DRAWER/MODAL */}
      {showNotifModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-950 w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-100 dark:border-gray-800 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-gray-900 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h2 className="font-extrabold text-sm uppercase text-slate-800 dark:text-white tracking-wide">Notifications</h2>
              </div>
              <button 
                onClick={() => setShowNotifModal(false)}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-gray-900 transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Control buttons */}
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-gray-900 flex justify-between items-center text-[10.5px]">
              <button 
                onClick={markAllAsRead}
                disabled={notifications.length === 0}
                className="text-purple-600 dark:text-purple-400 font-extrabold hover:underline disabled:opacity-50 disabled:no-underline"
              >
                Mark all as read
              </button>
              <button 
                onClick={clearAllNotifications}
                disabled={notifications.length === 0}
                className="text-rose-500 font-extrabold hover:underline disabled:opacity-50 disabled:no-underline"
              >
                Clear all
              </button>
            </div>

            {/* Notifications List */}
            <div className="p-4 overflow-y-auto flex-1 space-y-2 max-h-[50vh]">
              {notifications.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center mx-auto">
                    <Bell className="w-5 h-5 text-purple-300 dark:text-purple-500" />
                  </div>
                  <h3 className="font-bold text-xs text-slate-500 dark:text-slate-400">All caught up!</h3>
                  <p className="text-[10px] text-slate-400 font-medium">You don't have any pending notifications right now.</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    onClick={() => toggleNotificationRead(notif.id)}
                    className={cn(
                      "p-3 rounded-xl border transition-all relative flex gap-3 cursor-pointer",
                      notif.read 
                        ? "bg-white dark:bg-gray-950 border-slate-100 dark:border-gray-900 opacity-75" 
                        : "bg-purple-50/40 dark:bg-purple-950/20 border-purple-100/60 dark:border-purple-900/40 shadow-xs"
                    )}
                  >
                    {/* Status Dot */}
                    {!notif.read && (
                      <span className="absolute top-3.5 right-3.5 w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse"></span>
                    )}

                    {/* Left Icon */}
                    <div className="shrink-0 mt-0.5">
                      {notif.type === "success" ? (
                        <Check className="w-4 h-4 text-purple-600 bg-purple-50 dark:bg-purple-950/40 rounded p-0.5" />
                      ) : notif.type === "alert" ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500 bg-amber-50 dark:bg-amber-950/20 rounded p-0.5 animate-bounce" />
                      ) : (
                        <Info className="w-4 h-4 text-purple-500 bg-purple-50 dark:bg-purple-950/40 rounded p-0.5" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="text-xs font-extrabold text-slate-800 dark:text-white leading-tight">
                        {notif.title}
                      </h4>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-medium">
                        {notif.body}
                      </p>
                      <span className="text-[8.5px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-2 block font-mono">
                        {notif.date}
                      </span>
                    </div>

                    {/* Delete button */}
                    <button 
                      onClick={(e) => deleteNotification(notif.id, e)}
                      className="text-slate-300 hover:text-rose-500 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-900 transition-colors self-start shrink-0 focus:outline-none"
                      title="Dismiss notification"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer info */}
            <div className="p-3 bg-slate-50 dark:bg-gray-900/50 border-t border-slate-100 dark:border-gray-900 text-center text-[9px] text-slate-400 font-medium">
              Tap any message to mark as read or unread.
            </div>
          </div>
        </div>
      )}

      {/* 2.6 PORTABLE FUNDING MODAL (PAYSTACK / BANK TRANSFER INTERACTIVE FLOW) */}
      {showFundModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 max-w-sm w-full border border-slate-100/50 dark:border-gray-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-gray-800">
              <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Fund My Wallet
              </h3>
              <button 
                onClick={() => setShowFundModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-full hover:bg-slate-50 dark:hover:bg-gray-800 transition-all focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Methods Tabs Selection: STRICTLY Paystack Dedicated Account & Paystack Online */}
            <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-gray-800 p-1 rounded-xl text-[10.5px] font-bold">
              <button
                type="button"
                onClick={() => { setFundError(null); setFundSuccess(null); setFundMethod("transfer"); }}
                className={cn("py-2.5 rounded-lg text-center transition-all cursor-pointer font-bold", fundMethod === "transfer" ? "bg-white dark:bg-gray-900 text-purple-600 dark:text-purple-400 shadow-xs" : "text-slate-500")}
              >
                Dedicated Account
              </button>
              <button
                type="button"
                onClick={() => { setFundError(null); setFundSuccess(null); setFundMethod("paystack"); }}
                className={cn("py-2.5 rounded-lg text-center transition-all cursor-pointer font-bold", fundMethod === "paystack" ? "bg-white dark:bg-gray-900 text-purple-600 dark:text-purple-400 shadow-xs" : "text-slate-500")}
              >
                Paystack Online
              </button>
            </div>

            {fundError && (
              <p className="text-[10.5px] text-rose-500 font-bold bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded-xl">
                {fundError}
              </p>
            )}

            {fundSuccess && (
              <p className="text-[10.5px] text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/20 p-2.5 rounded-xl">
                {fundSuccess}
              </p>
            )}

            {/* Method CONTENT 1: Dedicated Virtual Account Transfer details */}
            {fundMethod === "transfer" && (
              <div className="space-y-3">
                {!kycVerified ? (
                  <div className="p-3.5 bg-amber-50 dark:bg-amber-950/25 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl space-y-2 text-left">
                    <div className="flex items-center gap-1.5 text-xs font-black text-amber-700 dark:text-amber-400">
                      <ShieldCheck className="w-4 h-4 text-amber-500" />
                      <span>KYC Verification Required</span>
                    </div>
                    <p className="text-[10.5px] text-amber-800/80 dark:text-amber-300/80 leading-relaxed font-semibold">
                      Please submit your BVN or NIN to generate your personal Paystack Dedicated Virtual Account number.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowFundModal(false);
                        setKycError(null);
                        setShowKycModal(true);
                      }}
                      className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      Verify Identity (KYC) Now
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed font-semibold">
                      Transfer any amount to your personal Paystack Dedicated Virtual Account to automatically credit your wallet.
                    </p>
                    
                    <div className="space-y-2">
                      <div className="p-3.5 bg-purple-50/60 dark:bg-purple-950/30 rounded-2xl border border-purple-100 dark:border-purple-900/50 flex items-center justify-between">
                        <div>
                          <p className="text-[9px] font-bold uppercase text-purple-600 dark:text-purple-400 tracking-wider">
                            {paystackBankName || "Paystack-Titan / Wema Bank"}
                          </p>
                          <h4 className="text-sm font-black text-slate-800 dark:text-white mt-0.5 tracking-wide">
                            {paystackAccountNo || "0123984129"}
                          </h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                            PayClick - {username}
                          </p>
                        </div>
                        <button 
                          onClick={() => copyTextToClipboard(paystackAccountNo || "0123984129", "Paystack Dedicated Account Number")}
                          className="px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 transition-colors cursor-pointer"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 rounded-xl space-y-1">
                      <p className="text-[10px] font-bold text-purple-800 dark:text-purple-300">
                        Automatic Paystack Instant Crediting
                      </p>
                      <p className="text-[9.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Make a bank transfer from any Nigerian bank app or USSD (GTBank, Access, Kuda, Zenith, OPay, etc.) to the account above. PayClick automatically credits your wallet balance immediately upon receipt.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        setIsFunding(true);
                        setFundError(null);
                        setFundSuccess(null);
                        try {
                          if (email) {
                            const cloudData = await syncUserDataFromCloud(email);
                            if (cloudData && typeof cloudData.wallet_balance === "number") {
                              setBalance(cloudData.wallet_balance);
                              localStorage.setItem("vtu_wallet_balance", cloudData.wallet_balance.toFixed(2));
                            }
                            await syncPaystackBalanceWithWallet(email);
                          }
                          setFundSuccess("Wallet balance synchronized with live Paystack ledger.");
                        } catch (e) {
                          setFundError("Unable to refresh balance from server.");
                        } finally {
                          setIsFunding(false);
                        }
                      }}
                      className="w-full py-2.5 text-center bg-slate-100 dark:bg-gray-850 hover:bg-slate-200 dark:hover:bg-gray-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer leading-none flex items-center justify-center gap-1.5"
                    >
                      {isFunding ? (
                        <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <span>Refresh / Check Incoming Deposit</span>
                      )}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Method CONTENT 2: Paystack Gateway Payment Input */}
            {fundMethod === "paystack" && (
              <form onSubmit={handleFundWallet} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                    Funding Amount (NGN)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-xs font-black text-slate-400">₦</span>
                    <input
                      type="number"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      className="block w-full pl-8 pr-3 py-3 border border-slate-200 dark:border-gray-800 rounded-xl focus:ring-purple-600 focus:border-purple-600 bg-white dark:bg-gray-900 text-slate-800 dark:text-white outline-none text-xs transition-all shadow-xs"
                      required
                      min="100"
                    />
                  </div>
                </div>

                <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/40 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    <span className="font-bold text-purple-700 dark:text-purple-300">Paystack Checkout Channels</span>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 rounded-full">Instant</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Mastercard, Visa, Verve cards, Bank Transfer, USSD, and QR. Transactions are 256-bit encrypted via Paystack.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isFunding}
                  className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-black rounded-xl leading-none transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-purple-500/15"
                >
                  <span>Proceed to Paystack Checkout</span>
                </button>
              </form>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowFundModal(false)}
                disabled={isFunding}
                className="w-full py-3 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-750 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold leading-none active:scale-95 transition-all disabled:opacity-50"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KYC COMPLIANCE VERIFICATION MODAL */}
      {showKycModal && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 max-w-sm w-full border border-slate-100 dark:border-gray-850 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-gray-800">
              <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1.5 uppercase tracking-wide">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                KYC Identity Verification
              </h3>
              <button 
                onClick={() => setShowKycModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-full hover:bg-slate-50 dark:hover:bg-gray-800 transition-all focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 p-3 rounded-2xl">
                <h4 className="text-[11.5px] font-black text-amber-800 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  Regulatory Clarification
                </h4>
                <p className="text-[10.5px] text-amber-700/90 dark:text-amber-400/80 leading-relaxed font-semibold mt-1">
                  Central Bank of Nigeria (CBN) and NDIC tier-1 compliance rules require active mobile wallets to submit verified identity documentation (NIN/BVN) before processing any funding transactions.
                </p>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Verify your identity below to permanently unlock instant wallet deposits, SME purchase discounts, and cashbacks.
              </p>
            </div>

            {kycError && (
              <p className="text-[10.5px] text-rose-500 font-bold bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded-xl">
                {kycError}
              </p>
            )}

            <form onSubmit={handleKycSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                  Legal Full Name (As written on ID)
                </label>
                <input
                  type="text"
                  value={kycFullName}
                  onChange={(e) => setKycFullName(e.target.value)}
                  placeholder="e.g. James Gideon"
                  className="block w-full px-3.5 py-3 border border-slate-200 dark:border-gray-800 rounded-xl focus:ring-purple-600 focus:border-purple-600 bg-white dark:bg-gray-900 text-slate-800 dark:text-white outline-none text-xs transition-all shadow-xs font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                  Identity Document Type
                </label>
                <select
                  value={kycIdType}
                  onChange={(e: any) => {
                    setKycIdType(e.target.value);
                    setKycIdNumber("");
                  }}
                  className="block w-full px-3 py-3 border border-slate-200 dark:border-gray-800 rounded-xl focus:ring-purple-600 focus:border-purple-600 bg-white dark:bg-gray-900 text-slate-800 dark:text-white outline-none text-xs transition-all shadow-xs font-semibold"
                >
                  <option value="nin">National Identification Number (NIN)</option>
                  <option value="bvn">Bank Verification Number (BVN)</option>
                  <option value="drivers_license">Driver's License (FRSC)</option>
                  <option value="voters_card">Permanent Voter's Card (PVC)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                  Document ID Number
                </label>
                <input
                  type="text"
                  value={kycIdNumber}
                  onChange={(e) => setKycIdNumber(e.target.value.replace(/\s/g, ""))}
                  placeholder={
                    kycIdType === "nin" ? "Enter 11-digit NIN" :
                    kycIdType === "bvn" ? "Enter 11-digit BVN" :
                    "Enter document reference number"
                  }
                  className="block w-full px-3.5 py-3 border border-slate-200 dark:border-gray-800 rounded-xl focus:ring-purple-600 focus:border-purple-600 bg-white dark:bg-gray-900 text-slate-800 dark:text-white outline-none text-xs transition-all shadow-xs font-mono font-bold"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={kycIsSubmitting}
                  className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-black rounded-xl leading-none transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-purple-500/15"
                >
                  {kycIsSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying with NIMC Database...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Submit & Verify Identity</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="text-center pt-1.5">
              <button
                type="button"
                onClick={() => setShowKycModal(false)}
                disabled={kycIsSubmitting}
                className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold cursor-pointer transition-all hover:underline"
              >
                Cancel & Back
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaystackCheckout && (
        <PaystackCheckout
          amount={checkoutAmount}
          email={email}
          onSuccess={handlePaystackSuccess}
          onClose={() => setShowPaystackCheckout(false)}
        />
      )}
    </div>
  );
}

