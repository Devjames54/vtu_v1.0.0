import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  User, 
  Mail, 
  ShieldCheck, 
  Lock, 
  Wallet, 
  ToggleLeft, 
  ToggleRight, 
  Smartphone, 
  Key, 
  CheckCircle,
  HelpCircle,
  RefreshCw,
  LogOut,
  Fingerprint,
  Edit2,
  Save,
  MapPin,
  Eye,
  EyeOff,
  Check,
  Palette,
  Phone,
  AtSign,
  ShieldAlert
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { cn } from "@/lib/utils";
import { saveUserFieldToCloud, syncUserDataFromCloud, db } from "../lib/firebase";
import { registerBiometricCredential } from "@/lib/webauthn";
import { doc, getDoc } from "firebase/firestore";

const SUPER_ADMIN_EMAIL = "payclickfocus@gmail.com";

const AVATAR_COLORS = [
  { name: "Purple Royal", value: "#7e22ce" },
  { name: "Purple Violet", value: "#9333ea" },
  { name: "Deep Purple", value: "#6b21a8" },
  { name: "Fuchsia Purple", value: "#c026d3" },
  { name: "Emerald", value: "#10b981" },
  { name: "Amber", value: "#f59e0b" }
];

export function Account() {
  const navigate = useNavigate();

  // Primary Email state
  const [email, setEmail] = useState(() => {
    return localStorage.getItem("vtu_user_email") || "user@payclick.com";
  });

  // Profile Fields (100% Editable)
  const [fullName, setFullName] = useState(() => localStorage.getItem("vtu_user_full_name") || "");
  const [username, setUsername] = useState(() => localStorage.getItem("vtu_user_username") || "");
  const [phone, setPhone] = useState(() => localStorage.getItem("vtu_user_phone") || "");
  const [address, setAddress] = useState(() => localStorage.getItem("vtu_user_address") || "");
  const [stateName, setStateName] = useState(() => localStorage.getItem("vtu_user_state") || "Lagos");
  const [city, setCity] = useState(() => localStorage.getItem("vtu_user_city") || "Ikeja");
  const [transactionPin, setTransactionPin] = useState(() => localStorage.getItem("vtu_user_tx_pin") || "1234");
  const [avatarColor, setAvatarColor] = useState(() => localStorage.getItem("vtu_user_avatar_color") || "#7e22ce");

  // Edit Section Toggles
  const [activeTab, setActiveTab] = useState<"overview" | "edit-profile" | "security" | "customization">("overview");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showPin, setShowPin] = useState(false);

  // Form temporary state during editing
  const [editFullName, setEditFullName] = useState(fullName);
  const [editUsername, setEditUsername] = useState(username);
  const [editPhone, setEditPhone] = useState(phone);
  const [editEmail, setEditEmail] = useState(email);
  const [editAddress, setEditAddress] = useState(address);
  const [editState, setEditState] = useState(stateName);
  const [editCity, setEditCity] = useState(city);
  const [editPin, setEditPin] = useState(transactionPin);
  const [savingProfile, setSavingProfile] = useState(false);

  // Wallet Balance
  const [balance, setBalance] = useState<number>(0);
  
  // Security setting states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(() => {
    return localStorage.getItem("sec_2fa_enabled") === "true";
  });
  const [biometricsEnabled, setBiometricsEnabled] = useState(() => {
    return localStorage.getItem("sec_biometrics_enabled") === "true";
  });
  const [limitNotifications, setLimitNotifications] = useState(true);

  // Dark mode setting state
  const [appDarkMode, setAppDarkMode] = useState(() => {
    return localStorage.getItem("vtu_dark_mode") === "true";
  });

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // States for biometric scanner
  const [showBioModal, setShowBioModal] = useState(false);
  const [bioStep, setBioStep] = useState<"ready" | "scanning" | "success" | "fallback">("ready");
  const [bioError, setBioError] = useState<string | null>(null);

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      setAppDarkMode(customEvent.detail.isDark);
    };
    window.addEventListener("vtu-theme-changed", handleThemeChange);
    return () => {
      window.removeEventListener("vtu-theme-changed", handleThemeChange);
    };
  }, []);

  const toggleAppDarkMode = () => {
    const nextDark = !appDarkMode;
    setAppDarkMode(nextDark);
    localStorage.setItem("vtu_dark_mode", String(nextDark));
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    window.dispatchEvent(new CustomEvent("vtu-theme-changed", { detail: { isDark: nextDark } }));
    showFeedback(nextDark ? "Dark Theme enabled globally." : "Light Theme enabled globally.");
  };

  // Sync profile data on mount or email change
  useEffect(() => {
    const loadProfileData = async () => {
      try {
        if (email) {
          const cloudData = await syncUserDataFromCloud(email);
          if (cloudData) {
            if (cloudData.wallet_balance !== undefined) setBalance(cloudData.wallet_balance);
            if (cloudData.full_name) {
              setFullName(cloudData.full_name);
              setEditFullName(cloudData.full_name);
            }
            if (cloudData.username) {
              setUsername(cloudData.username);
              setEditUsername(cloudData.username);
            }
            if (cloudData.phone) {
              setPhone(cloudData.phone);
              setEditPhone(cloudData.phone);
            }
            if (cloudData.address) {
              setAddress(cloudData.address);
              setEditAddress(cloudData.address);
            }
            if (cloudData.state) {
              setStateName(cloudData.state);
              setEditState(cloudData.state);
            }
            if (cloudData.city) {
              setCity(cloudData.city);
              setEditCity(cloudData.city);
            }
            if (cloudData.transaction_pin) {
              setTransactionPin(cloudData.transaction_pin);
              setEditPin(cloudData.transaction_pin);
            }
            if (cloudData.avatar_color) {
              setAvatarColor(cloudData.avatar_color);
            }
            return;
          }
        }
      } catch (err) {
        console.warn("Firestore user sync on Account page failed:", err);
      }

      const stored = localStorage.getItem("vtu_wallet_balance");
      if (stored) {
        setBalance(parseFloat(stored));
      } else {
        setBalance(0);
      }
    };
    loadProfileData();
  }, [email]);

  // Handle Full Profile Save (100% Profile Modification)
  const handleSaveFullProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const trimmedEmail = editEmail.trim().toLowerCase();
      
      // Update local storage
      localStorage.setItem("vtu_user_email", trimmedEmail);
      localStorage.setItem("vtu_user_full_name", editFullName.trim());
      localStorage.setItem("vtu_user_username", editUsername.trim());
      localStorage.setItem("vtu_user_phone", editPhone.trim());
      localStorage.setItem("vtu_user_address", editAddress.trim());
      localStorage.setItem("vtu_user_state", editState.trim());
      localStorage.setItem("vtu_user_city", editCity.trim());
      localStorage.setItem("vtu_user_tx_pin", editPin.trim());
      localStorage.setItem("vtu_user_avatar_color", avatarColor);

      // Update state
      setEmail(trimmedEmail);
      setFullName(editFullName.trim());
      setUsername(editUsername.trim());
      setPhone(editPhone.trim());
      setAddress(editAddress.trim());
      setStateName(editState.trim());
      setCity(editCity.trim());
      setTransactionPin(editPin.trim());

      // Save to Cloud Firestore
      await saveUserFieldToCloud(trimmedEmail, "full_name", editFullName.trim());
      await saveUserFieldToCloud(trimmedEmail, "username", editUsername.trim());
      await saveUserFieldToCloud(trimmedEmail, "phone", editPhone.trim());
      await saveUserFieldToCloud(trimmedEmail, "address", editAddress.trim());
      await saveUserFieldToCloud(trimmedEmail, "state", editState.trim());
      await saveUserFieldToCloud(trimmedEmail, "city", editCity.trim());
      await saveUserFieldToCloud(trimmedEmail, "transaction_pin", editPin.trim());
      await saveUserFieldToCloud(trimmedEmail, "avatar_color", avatarColor);

      setIsEditingProfile(false);
      showFeedback("✓ Profile details updated and synced to Cloud!");
    } catch (err) {
      console.error("Failed to save profile modifications:", err);
      showFeedback("Failed to update profile. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  const toggle2FA = () => {
    const next = !twoFactorEnabled;
    setTwoFactorEnabled(next);
    localStorage.setItem("sec_2fa_enabled", String(next));
    showFeedback(next ? "Two-Factor Verification Enabled successfully." : "Two-Factor Verification Disabled.");
  };

  const toggleBiometrics = () => {
    if (!biometricsEnabled) {
      setBioError(null);
      setShowBioModal(true);
      setBioStep("ready");
    } else {
      setBiometricsEnabled(false);
      localStorage.setItem("sec_biometrics_enabled", "false");
      showFeedback("Biometric authentication deactivated.");
    }
  };

  const handleStartScan = async () => {
    setBioError(null);
    setBioStep("scanning");

    try {
      await registerBiometricCredential(email);
      setBioStep("success");
      
      setTimeout(() => {
        setBiometricsEnabled(true);
        localStorage.setItem("sec_biometrics_enabled", "true");
        setShowBioModal(false);
        showFeedback("WebAuthn hardware credentials enrolled successfully!");
      }, 1500);

    } catch (err: any) {
      console.warn("WebAuthn Registration error:", err);
      setBioError(err?.message || "Biometric credential registration failed.");
      setBioStep("ready");
    }
  };

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const syncWalletBalance = async () => {
    try {
      showFeedback("Syncing balance with cloud database...");
      if (email) {
        const cloudData = await syncUserDataFromCloud(email);
        if (cloudData && typeof cloudData.wallet_balance === "number") {
          setBalance(cloudData.wallet_balance);
          localStorage.setItem("vtu_wallet_balance", cloudData.wallet_balance.toFixed(2));
          showFeedback("Live balance synchronized!");
          return;
        }
      }
      showFeedback("Balance is up to date.");
    } catch (e) {
      showFeedback("Sync error. Please check connection.");
    }
  };

  // Strict Admin Check - ONLY payclickfocus@gmail.com or authorized local admins
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(false);

  useEffect(() => {
    const emailLower = email.toLowerCase().trim();
    if (!emailLower) {
      setIsAdminAuthorized(false);
      return;
    }

    if (emailLower === SUPER_ADMIN_EMAIL) {
      setIsAdminAuthorized(true);
      return;
    }

    const configDocRef = doc(db, "system", "settings");
    getDoc(configDocRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const localAdmins: string[] = data.localAdmins || [];
        const isAuthorized = localAdmins.map(e => e.toLowerCase().trim()).includes(emailLower);
        setIsAdminAuthorized(isAuthorized);
      } else {
        setIsAdminAuthorized(false);
      }
    }).catch((err) => {
      console.warn("Could not load admin settings:", err);
      setIsAdminAuthorized(false);
    });
  }, [email]);

  const isAdmin = isAdminAuthorized;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 pb-24 text-gray-800 dark:text-gray-100 transition-colors duration-200 select-none">
      {/* HEADER */}
      <header className="bg-white dark:bg-gray-900 shadow-xs sticky top-0 z-20 px-4 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate("/")}
            className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">My Profile & Settings</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Account Control Panel</p>
          </div>
        </div>
        <button 
          onClick={() => {
            localStorage.removeItem("vtu_user_email");
            localStorage.removeItem("vtu_user_full_name");
            localStorage.removeItem("vtu_user_phone");
            localStorage.removeItem("vtu_user_username");
            navigate("/welcome");
            window.location.reload();
          }}
          className="text-xs font-black text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer border border-rose-100 dark:border-rose-900/40"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </button>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-4">
        
        {/* Dynamic feedback toast */}
        {feedbackMsg && (
          <div className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 p-3.5 rounded-2xl text-xs font-bold text-center shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* PROFILE BANNER CARD */}
        <div 
          style={{ backgroundColor: avatarColor }}
          className="text-white rounded-3xl p-5 shadow-sm space-y-4 relative overflow-hidden transition-all duration-300"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-2xl text-white border border-white/30 shadow-inner shrink-0">
              {fullName ? fullName.substring(0, 1).toUpperCase() : email.substring(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full text-white border border-white/20">
                  Verified Member
                </span>
              </div>
              <h3 className="text-lg font-black truncate text-white mt-1">
                {fullName || "PayClick Customer"}
              </h3>
              <p className="text-xs text-white/80 font-mono truncate">{email}</p>
              {phone && <p className="text-[11px] text-white/70 font-mono mt-0.5">{phone}</p>}
            </div>
          </div>

          <div className="pt-3 border-t border-white/20 flex justify-between items-end">
            <div>
              <p className="text-[10px] text-white/80 uppercase font-black tracking-widest flex items-center gap-1">
                <Wallet className="w-3 h-3" />
                Wallet Balance
              </p>
              <p className="text-2xl font-black mt-0.5 font-mono">
                ₦{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <button
              onClick={syncWalletBalance}
              className="bg-white text-slate-900 px-3 py-1.5 text-[10px] font-black rounded-xl uppercase tracking-wider shadow-xs hover:bg-slate-50 active:scale-95 transition-all flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3 text-purple-600" />
              Sync Balance
            </button>
          </div>
        </div>

        {/* ADMIN PANEL ACCESS BUTTON - HIDDEN FOR CUSTOMERS, VISIBLE ONLY FOR payclickfocus@gmail.com */}
        {isAdmin && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <ShieldCheck className="w-5 h-5 animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-wider">Super Admin Console</h3>
              </div>
              <span className="text-[9px] font-mono bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-black">
                ROOT SYSTEM
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-gray-400 leading-relaxed font-medium">
              You possess system administrative access (`payclickfocus@gmail.com`). You have root privileges to manage gateway keys, inspect accounts, update user balances, and configure API providers.
            </p>
            <button
              onClick={() => navigate("/admin")}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              Open Admin Console
            </button>
          </div>
        )}

        {/* 100% PROFILE EDITING & MODIFICATION CONTAINER */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-xs border border-purple-100/60 dark:border-purple-900/30 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <User className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Profile Details</h3>
            </div>
            {!isEditingProfile ? (
              <button
                type="button"
                onClick={() => {
                  setEditFullName(fullName);
                  setEditUsername(username);
                  setEditPhone(phone);
                  setEditEmail(email);
                  setEditAddress(address);
                  setEditState(stateName);
                  setEditCity(city);
                  setEditPin(transactionPin);
                  setIsEditingProfile(true);
                }}
                className="text-xs font-black text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/50 px-3 py-1.5 rounded-xl flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Profile
              </button>
            ) : (
              <span className="text-[10px] font-black uppercase text-amber-500 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-md">
                Editing Mode
              </span>
            )}
          </div>

          {!isEditingProfile ? (
            /* READ-ONLY SUMMARY OF 100% EDITABLE FIELDS */
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-gray-850 rounded-xl space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Full Name</span>
                <p className="font-extrabold text-slate-900 dark:text-slate-100 truncate">
                  {fullName || "Not set"}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-gray-850 rounded-xl space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Username</span>
                <p className="font-extrabold text-slate-900 dark:text-slate-100 truncate">
                  {username ? `@${username}` : "Not set"}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-gray-850 rounded-xl space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Phone Number</span>
                <p className="font-extrabold text-slate-900 dark:text-slate-100 truncate">
                  {phone || "Not set"}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-gray-850 rounded-xl space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Email Address</span>
                <p className="font-extrabold text-slate-900 dark:text-slate-100 truncate">
                  {email}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-gray-850 rounded-xl space-y-0.5 col-span-2">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Address & Location</span>
                <p className="font-extrabold text-slate-900 dark:text-slate-100">
                  {address ? `${address}, ${city}, ${stateName}` : `${city}, ${stateName} State`}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-gray-850 rounded-xl flex items-center justify-between col-span-2">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Transaction PIN</span>
                  <p className="font-mono font-extrabold text-slate-900 dark:text-slate-100">
                    {showPin ? transactionPin : "••••"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ) : (
            /* 100% PROFILE EDITING FORM */
            <form onSubmit={handleSaveFullProfile} className="space-y-3.5">
              <div className="space-y-3">
                {/* Full Name */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input 
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      placeholder="e.g. James Gideon"
                      className="w-full text-slate-900 dark:text-white bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-purple-600 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Username & Phone Row */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Username
                    </label>
                    <div className="relative">
                      <AtSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input 
                        type="text"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        placeholder="james_g"
                        className="w-full text-slate-900 dark:text-white bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-purple-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input 
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="08012345678"
                        className="w-full text-slate-900 dark:text-white bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-purple-600 focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input 
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full text-slate-900 dark:text-white bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-purple-600 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Street Address */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Street Address
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input 
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="12 Allen Avenue"
                      className="w-full text-slate-900 dark:text-white bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-purple-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* City & State Row */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      City / LGA
                    </label>
                    <input 
                      type="text"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      placeholder="Ikeja"
                      className="w-full text-slate-900 dark:text-white bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      State
                    </label>
                    <input 
                      type="text"
                      value={editState}
                      onChange={(e) => setEditState(e.target.value)}
                      placeholder="Lagos State"
                      className="w-full text-slate-900 dark:text-white bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* 4-Digit Security Transaction PIN */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    4-Digit Security Transaction PIN
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input 
                      type="password"
                      maxLength={4}
                      value={editPin}
                      onChange={(e) => setEditPin(e.target.value.replace(/\D/g, ""))}
                      placeholder="1234"
                      className="w-full text-slate-900 dark:text-white bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-bold focus:ring-2 focus:ring-purple-600 focus:outline-none tracking-widest"
                      required
                    />
                  </div>
                </div>

                {/* Avatar Color Picker */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center gap-1">
                    <Palette className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    Profile Card Accent Color
                  </label>
                  <div className="flex items-center gap-2 pt-0.5">
                    {AVATAR_COLORS.map((col) => (
                      <button
                        key={col.value}
                        type="button"
                        onClick={() => setAvatarColor(col.value)}
                        style={{ backgroundColor: col.value }}
                        className={cn(
                          "w-7 h-7 rounded-full transition-transform cursor-pointer border-2 border-white dark:border-gray-900 shadow-xs",
                          avatarColor === col.value ? "scale-125 ring-2 ring-offset-2 ring-purple-500" : "opacity-75 hover:opacity-100"
                        )}
                        title={col.name}
                      />
                    ))}
                  </div>
                </div>

              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center gap-2 justify-end pt-2 border-t border-slate-100 dark:border-gray-800">
                <button 
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  disabled={savingProfile}
                  className="px-4 py-2 bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={savingProfile}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl shadow-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {savingProfile ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      Save Modifications
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* SECURITY SYSTEM SEGMENT */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-xs border border-purple-100/60 dark:border-purple-900/30 space-y-3.5">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-gray-800">
            <ShieldCheck className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Security & Preferences</h3>
          </div>

          <div className="space-y-3">
            
            {/* Toggle 2FA */}
            <div className="flex items-center justify-between py-1">
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Two-Factor Authentication (2FA)</h4>
                <p className="text-[10px] text-slate-400">Demand temporary passcode on high-value transactions</p>
              </div>
              <button 
                onClick={toggle2FA}
                className="text-slate-600 dark:text-slate-300 hover:text-purple-600 transition-colors cursor-pointer"
              >
                {twoFactorEnabled ? (
                  <ToggleRight className="w-10 h-10 text-purple-600 stroke-[1.25]" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-slate-300 dark:text-slate-600 stroke-[1.25]" />
                )}
              </button>
            </div>

            {/* Toggle Biometrics */}
            <div className="flex items-center justify-between py-1 border-t border-slate-50 dark:border-gray-800/50 pt-2">
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Biometric / Face ID Login</h4>
                <p className="text-[10px] text-slate-400">Unlock your digital PayClick wallet instantly</p>
              </div>
              <button 
                onClick={toggleBiometrics}
                className="text-slate-600 dark:text-slate-300 hover:text-purple-600 transition-colors cursor-pointer"
              >
                {biometricsEnabled ? (
                  <ToggleRight className="w-10 h-10 text-purple-600 stroke-[1.25]" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-slate-300 dark:text-slate-600 stroke-[1.25]" />
                )}
              </button>
            </div>

            {/* Limit Notifications */}
            <div className="flex items-center justify-between py-1 border-t border-slate-50 dark:border-gray-800/50 pt-2">
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Limit Notification Alerts</h4>
                <p className="text-[10px] text-slate-400 font-normal">Alert when purchases exceed ₦5,000 threshold</p>
              </div>
              <button 
                onClick={() => {
                  setLimitNotifications(!limitNotifications);
                  showFeedback("Notification limits preference updated.");
                }}
                className="text-slate-600 dark:text-slate-300 hover:text-purple-600 transition-colors cursor-pointer"
              >
                {limitNotifications ? (
                  <ToggleRight className="w-10 h-10 text-purple-600 stroke-[1.25]" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-slate-300 dark:text-slate-600 stroke-[1.25]" />
                )}
              </button>
            </div>

            {/* Global Dark Mode */}
            <div className="flex items-center justify-between py-1 border-t border-slate-50 dark:border-gray-800/50 pt-2">
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Global Dark Theme</h4>
                <p className="text-[10px] text-slate-400 font-normal">Switch application theme between light/dark mode</p>
              </div>
              <button 
                onClick={toggleAppDarkMode}
                className="text-slate-600 dark:text-slate-300 hover:text-purple-600 transition-colors cursor-pointer"
              >
                {appDarkMode ? (
                  <ToggleRight className="w-10 h-10 text-purple-600 stroke-[1.25]" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-slate-300 dark:text-slate-600 stroke-[1.25]" />
                )}
              </button>
            </div>

          </div>
        </div>

        {/* ENROLLED HARDWARE SESSIONS */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-xs border border-purple-100/60 dark:border-purple-900/30 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Lock className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Active Sessions</h3>
            </div>
            <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 uppercase font-black bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded">
              Encrypted
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Active Web Terminal (This Device)</p>
                  <p className="text-[10px] text-slate-400">Lagos, Nigeria • Active Now</p>
                </div>
              </div>
              <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 whitespace-nowrap bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-md">
                Current
              </span>
            </div>
          </div>
        </div>

      </main>

      {/* BIOMETRIC SCANNING OVERLAY MODAL */}
      {showBioModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 max-w-sm w-full border border-slate-100 dark:border-gray-800 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center relative overflow-hidden border border-purple-100 dark:border-purple-900/40">
                <Fingerprint className={cn("w-10 h-10 transition-all duration-300", 
                  bioStep === "scanning" && "animate-pulse scale-110 text-amber-500",
                  bioStep === "fallback" && "scale-95 text-purple-400 animate-bounce",
                  bioStep === "success" && "text-purple-600 scale-125 rotate-12"
                )} />
                {bioStep === "scanning" && (
                  <span className="absolute left-0 right-0 h-0.5 bg-amber-500 bottom-0 animate-bounce"></span>
                )}
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white mt-4">
                {bioStep === "ready" && "Enroll Biometrics"}
                {bioStep === "scanning" && "Contacting Hardware..."}
                {bioStep === "fallback" && "Secure Device Key Setup"}
                {bioStep === "success" && "Enrollment Successful!"}
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 max-w-[240px] mx-auto leading-relaxed">
                {bioStep === "ready" && "PayClick will register a secure cryptographic key on this device using Web Authentication API."}
                {bioStep === "scanning" && "Initializing Touch ID / Face ID hardware. Please scan your biometrics..."}
                {bioStep === "fallback" && "Hardware biometrics unavailable in current browser context. Launching secure device credential setup..."}
                {bioStep === "success" && "Your biometric security profile is successfully compiled and linked to this device!"}
              </p>
            </div>

            {bioError && (
              <p className="text-[11px] text-rose-500 font-bold bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/40">
                {bioError}
              </p>
            )}

            {(bioStep === "scanning" || bioStep === "fallback") && (
              <div className="w-24 mx-auto bg-slate-100 dark:bg-gray-800 h-1 rounded-full overflow-hidden relative">
                <div className={cn("absolute top-0 left-0 h-full w-full animate-pulse",
                  bioStep === "fallback" ? "bg-purple-500" : "bg-amber-500"
                )}></div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBioModal(false)}
                disabled={bioStep === "scanning" || bioStep === "fallback"}
                className="w-full py-3 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-750 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold leading-none active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              {bioStep === "ready" && (
                <button
                  type="button"
                  onClick={handleStartScan}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black leading-none active:scale-95 transition-all shadow-xs cursor-pointer"
                >
                  Authorize Scan
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
