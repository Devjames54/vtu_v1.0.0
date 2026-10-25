import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Lock, User, Check, Eye, EyeOff, ShieldAlert, ArrowRight, Fingerprint } from "lucide-react";
import { Logo } from "@/components/Logo";
import { auth, db, syncUserDataFromCloud, findUserInCloud, signInWithSocialProvider } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { verifyBiometricCredential } from "@/lib/webauthn";

export function Login() {
  const savedEmail = typeof window !== "undefined" ? localStorage.getItem("vtu_user_email") : null;
  const savedFullName = typeof window !== "undefined" ? localStorage.getItem("vtu_user_full_name") : null;
  const savedUsername = typeof window !== "undefined" ? localStorage.getItem("vtu_user_username") : null;
  const savedPhone = typeof window !== "undefined" ? localStorage.getItem("vtu_user_phone") : null;
  const savedAvatarColor = typeof window !== "undefined" ? (localStorage.getItem("vtu_avatar_color") || "#9333ea") : "#9333ea";

  const [view, setView] = useState<"biometric" | "password">(() => savedEmail ? "biometric" : "password");
  const [identifier, setIdentifier] = useState(savedEmail || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Loading & Error States
  const [isVerifying, setIsVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "facebook" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleSocialLogin = async (provider: "google" | "facebook") => {
    setError(null);
    setSocialLoading(provider);
    try {
      const result = await signInWithSocialProvider(provider);
      await completeLogin(result.email, false);
    } catch (err: any) {
      console.warn(`${provider} social login error:`, err);
      if (err?.code === "auth/popup-blocked") {
        setError("Sign-in popup was blocked by your browser. Please allow popups for this site.");
      } else if (err?.code === "auth/popup-closed-by-user") {
        // User closed popup
      } else if (err?.code === "auth/operation-not-allowed") {
        setError(`${provider === "google" ? "Google" : "Facebook"} sign-in is not yet enabled in the Firebase project console. Please use password login or enable the provider in Firebase Authentication.`);
      } else {
        setError(`Failed to sign in with ${provider === "google" ? "Google" : "Facebook"}: ${err?.message || "Please check credentials."}`);
      }
    } finally {
      setSocialLoading(null);
    }
  };

  // Helper to handle login post-actions (local storage + Firestore sync)
  const completeLogin = async (emailToUse: string, isBiometric: boolean = false) => {
    localStorage.setItem("vtu_user_email", emailToUse);
    if (isBiometric) {
      setSuccessMsg("Biometric verified! Signing into PayClick...");
    } else {
      setSuccessMsg("Logged in successfully! Syncing your cloud data...");
    }

    try {
      // Warm up and sync Firebase Firestore
      await syncUserDataFromCloud(emailToUse);
    } catch (e) {
      console.warn("Could not sync Firestore on login, falling back to local storage:", e);
    }

    setTimeout(() => {
      navigate("/");
      // Force reload to update global App state and navigation
      window.location.reload();
    }, 1200);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;

    setError(null);
    setLoading(true);

    const email = identifier.includes("@") ? identifier.trim().toLowerCase() : `${identifier.trim()}@payclick.com`;

    try {
      // 1. Try real Firebase Auth first
      await signInWithEmailAndPassword(auth, email, password);
      await completeLogin(email, false);
    } catch (err: any) {
      console.warn("Firebase Auth error, querying real Firestore database:", err);

      // Check if user is Super Admin with correct super password
      if (email === "payclickfocus@gmail.com" && password === "PayClick@20206") {
        await completeLogin(email, false);
        return;
      }

      // Query real cloud user database from Firestore by identifier (email, phone, or username)
      const cloudUser = await findUserInCloud(identifier);
      if (cloudUser) {
        if (cloudUser.password && cloudUser.password === password) {
          const userEmail = cloudUser.email || (identifier.includes("@") ? identifier.trim().toLowerCase() : `${identifier.trim()}@payclick.com`);
          await completeLogin(userEmail, false);
          return;
        } else {
          setError("Invalid password. Please check your credentials.");
          setLoading(false);
          return;
        }
      }

      // Check direct email doc in Firestore as backup lookup
      try {
        const userRef = doc(db, "users", email);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.password && userData.password === password) {
            await completeLogin(email, false);
            return;
          }
        }
      } catch (firestoreErr) {
        console.warn("Could not query direct accounts from Firestore:", firestoreErr);
      }

      setError("Account not found or invalid password. Please sign up or check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleFingerprintLogin = async () => {
    setError(null);
    setIsVerifying(true);
    
    try {
      const storedEmail = localStorage.getItem("vtu_user_email");
      if (!storedEmail) {
        setError("No saved account on this device. Please log in with your email and password first.");
        setView("password");
        setIsVerifying(false);
        return;
      }

      const verified = await verifyBiometricCredential(storedEmail);
      if (verified) {
        await completeLogin(storedEmail, true);
      } else {
        setError("Biometric verification failed. Please enter your password.");
      }
    } catch (bioErr: any) {
      console.warn("Biometric verification error:", bioErr);
      setError(bioErr?.message || "Biometric verification failed. Please enter your password.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex flex-col justify-between p-6 sm:max-w-md sm:mx-auto">
      {/* Top Section */}
      <div className="w-full flex justify-center py-4">
        <Logo size="sm" />
      </div>

      {/* Main Form Area */}
      <div className="flex-1 flex flex-col justify-center py-4">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl flex items-start gap-2 text-rose-600 dark:text-rose-400 text-xs font-semibold"
          >
            <ShieldAlert className="w-4.5 h-4.5 shrink-0 mt-0.5" />
            <div>{error}</div>
          </motion.div>
        )}

        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl flex items-start gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold"
          >
            <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-emerald-600" />
            </div>
            <div>{successMsg}</div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {view === "biometric" ? (
            /* Biometrics Screen */
            <motion.div
              key="biometric"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center justify-center py-4"
            >
              {/* User Avatar Badge */}
              <div className="relative mb-3">
                <div 
                  className="w-20 h-20 rounded-full border-4 border-white dark:border-gray-900 shadow-md flex items-center justify-center text-white text-2xl font-black"
                  style={{ backgroundColor: savedAvatarColor || "#9333ea" }}
                >
                  {savedFullName 
                    ? savedFullName.charAt(0).toUpperCase() 
                    : (savedUsername ? savedUsername.charAt(0).toUpperCase() : (savedEmail ? savedEmail.charAt(0).toUpperCase() : "P"))}
                </div>
                <span className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full flex items-center justify-center text-white text-[10px] font-black">
                  ✓
                </span>
              </div>

              <h2 className="text-slate-900 dark:text-white font-black text-lg">
                {savedFullName 
                  ? `Hi, ${savedFullName.split(" ")[0]}` 
                  : (savedUsername ? `Hi, ${savedUsername}` : (savedEmail ? `Hi, ${savedEmail.split("@")[0]}` : "Welcome Back"))}
              </h2>
              <p className="text-slate-400 dark:text-slate-500 text-xs font-semibold mb-8">
                {savedPhone 
                  ? `${savedPhone} (Verified)` 
                  : (savedEmail ? `${savedEmail} (Verified)` : "Sign in to your PayClick account")}
              </p>

              {/* Fingerprint Visual Panel */}
              <div 
                onClick={!isVerifying ? handleFingerprintLogin : undefined}
                className="relative flex flex-col items-center mb-8 group cursor-pointer"
              >
                <div className={`p-6 rounded-full bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 shadow-md transition-all duration-300 ${
                  isVerifying ? "scale-105 border-purple-400 dark:border-purple-500 ring-4 ring-purple-500/10" : "hover:scale-102 group-hover:border-purple-300"
                }`}>
                  <motion.div
                    animate={isVerifying ? { scale: [1, 1.08, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  >
                    <Fingerprint 
                      className={`w-20 h-20 transition-colors ${
                        isVerifying 
                          ? "text-purple-600 dark:text-purple-400 animate-pulse" 
                          : "text-slate-400 dark:text-slate-500 group-hover:text-slate-500"
                      }`}
                      strokeWidth={1.25}
                    />
                  </motion.div>
                </div>
                
                <p className="text-purple-600 dark:text-purple-400 font-extrabold text-xs mt-4 tracking-wider uppercase">
                  {isVerifying ? "Scanning Ridge Details..." : "Tap Fingerprint to Unlock"}
                </p>
              </div>

              {/* Button Frame */}
              <button
                onClick={handleFingerprintLogin}
                disabled={isVerifying}
                className="w-56 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white py-3.5 rounded-full font-extrabold text-sm shadow-md shadow-purple-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isVerifying ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  "Verify & Sign In"
                )}
              </button>
            </motion.div>
          ) : (
            /* Secure Password Form */
            <motion.div
              key="password"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="py-4"
            >
              <div className="mb-6">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Secure Sign In</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-semibold">
                  Access your wallet, airtime refunds, and multipliers
                </p>
              </div>

              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Phone Number or Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Mail className="h-4.5 w-4.5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-slate-200 dark:border-gray-800 rounded-xl focus:ring-purple-600 focus:border-purple-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none text-xs transition-all shadow-sm"
                      placeholder="08012345678 or john@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                      Password
                    </label>
                    <Link 
                      to="/forgot-password" 
                      className="text-xs text-purple-600 dark:text-purple-400 font-bold hover:underline"
                    >
                      Forgot?
                    </Link>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className="h-4.5 w-4.5 text-slate-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-3 border border-slate-200 dark:border-gray-800 rounded-xl focus:ring-purple-600 focus:border-purple-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none text-xs transition-all shadow-sm"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 outline-none"
                    >
                      {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-extrabold text-xs shadow-md shadow-purple-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Sign In Securely</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Social Login Divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-gray-800"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-50 dark:bg-gray-950 px-2 text-[10px] font-bold text-slate-400">
                      Or sign in with
                    </span>
                  </div>
                </div>

                {/* Google and Facebook Buttons */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSocialLogin("google")}
                    disabled={socialLoading !== null || loading}
                    className="py-2.5 px-3 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-gray-850 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
                  >
                    {socialLoading === "google" ? (
                      <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    )}
                    <span>Google</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSocialLogin("facebook")}
                    disabled={socialLoading !== null || loading}
                    className="py-2.5 px-3 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-gray-850 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
                  >
                    {socialLoading === "facebook" ? (
                      <div className="w-4 h-4 border-2 border-[#1877F2] border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4 shrink-0 fill-[#1877F2]" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    )}
                    <span>Facebook</span>
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer / Switches */}
      <div className="py-4 flex flex-col items-center gap-4 border-t border-slate-100 dark:border-gray-900 mt-auto">
        <div className="flex items-center justify-center gap-4 text-xs font-bold text-slate-400">
          {view === "biometric" ? (
            <button
              onClick={() => {
                setError(null);
                setView("password");
              }}
              className="text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
            >
              Sign In with Password
            </button>
          ) : (
            <button
              onClick={() => {
                setError(null);
                setView("biometric");
              }}
              className="text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
            >
              Use Biometric Quick Unlock
            </button>
          )}
        </div>

        <div className="text-xs font-bold text-slate-400">
          New to PayClick Focus?{" "}
          <Link to="/signup" className="text-purple-600 dark:text-purple-400 hover:underline">
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}
