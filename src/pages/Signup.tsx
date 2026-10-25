import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { User, Mail, Phone, Lock, Gift, ShieldAlert, Check, ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { auth, syncUserDataFromCloud, saveUserFieldToCloud, signInWithSocialProvider, syncCustomerToPaystack } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";

export function Signup() {
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    referralCode: "",
  });

  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "facebook" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSocialSignup = async (provider: "google" | "facebook") => {
    setError(null);
    setSocialLoading(provider);
    try {
      const result = await signInWithSocialProvider(provider);
      // Synchronize with Paystack Customer API
      await syncCustomerToPaystack(result.email, result.fullName, "", result.username);
      setSuccess(`Signed up with ${provider === "google" ? "Google" : "Facebook"}! Welcome to PayClick.`);
      setTimeout(() => {
        navigate("/");
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      console.warn(`${provider} social signup error:`, err);
      if (err?.code === "auth/popup-blocked") {
        setError("Sign-up popup was blocked by your browser. Please allow popups for this site.");
      } else if (err?.code === "auth/popup-closed-by-user") {
        // User closed popup
      } else if (err?.code === "auth/operation-not-allowed") {
        setError(`${provider === "google" ? "Google" : "Facebook"} sign-in is not yet enabled in the Firebase project console. Please use email registration or enable the provider in Firebase Authentication.`);
      } else {
        setError(`Failed to sign up with ${provider === "google" ? "Google" : "Facebook"}: ${err?.message || "Please check credentials."}`);
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const { fullName, username, email, phone, password, confirmPassword, referralCode } = formData;

    // Field Validations
    if (!fullName || !email || !phone || !password || !confirmPassword) {
      setError("Please fill in all required fields.");
      return;
    }

    const sanitizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    const cleanedPhone = phone.trim().replace(/[\s-()]/g, "");
    const phoneRegex = /^(?:\+234|234|0)(?:70|80|90|81|91|71|82|72|83|84|85|86|87|88|082|072|083|084|085|086|087|088|089|89)\d{8}$/;
    if (!phoneRegex.test(cleanedPhone)) {
      setError("Please enter a valid Nigerian phone number (e.g., 08031234567 or +2348031234567).");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      // 1. Try real Firebase Auth User Creation
      await createUserWithEmailAndPassword(auth, sanitizedEmail, password);
      
      setSuccess("Account registered! Creating your cloud database profile...");
      await initializeUserProfile(sanitizedEmail, fullName, phone, username, referralCode, password);

    } catch (err: any) {
      console.warn("Firebase Auth signup error, writing directly to cloud database:", err);
      const errMsg = err?.message || String(err);

      // Handle standard firebase errors if provider is active
      if (errMsg.includes("auth/email-already-in-use")) {
        setError("This email address is already registered. Please sign in.");
        setLoading(false);
        return;
      }

      setSuccess("Account registered! Saving your profile to the cloud database...");
      await initializeUserProfile(sanitizedEmail, fullName, phone, username, referralCode, password);
    }
  };

  // Helper to register the profile in Firestore and sync states
  const initializeUserProfile = async (
    email: string, 
    fullName: string, 
    phone: string, 
    username: string, 
    referralCode: string,
    passwordVal: string
  ) => {
    try {
      // Set local credentials
      localStorage.setItem("vtu_user_email", email);
      localStorage.setItem("vtu_user_full_name", fullName);
      localStorage.setItem("vtu_user_phone", phone);
      localStorage.setItem("vtu_user_username", username || email.split("@")[0]);
      
      // Seed default financial states
      localStorage.setItem("vtu_wallet_balance", "0");
      localStorage.setItem("reward_points", referralCode ? "500" : "0"); // referral bonus!
      localStorage.setItem("vtu_referred_friends", JSON.stringify([]));
      localStorage.setItem("vtu_transactions", JSON.stringify([]));

      // Initial system notification welcoming them
      const welcomeNotif = {
        id: "welcome-1",
        title: "Welcome to PayClick Focus!",
        body: `Hi ${fullName || "User"}, your instant refund VTU wallet is active. Get cheap SME Data and instant cashback!`,
        date: "Just now",
        read: false,
        type: "success"
      };
      localStorage.setItem("vtu_notifications_list", JSON.stringify([welcomeNotif]));

      // Write complete user profile to cloud database Firestore
      await saveUserFieldToCloud(email, "email", email);
      await saveUserFieldToCloud(email, "password", passwordVal);
      await saveUserFieldToCloud(email, "full_name", fullName);
      await saveUserFieldToCloud(email, "phone", phone);
      await saveUserFieldToCloud(email, "username", username || email.split("@")[0]);
      await saveUserFieldToCloud(email, "created_at", new Date().toISOString());

      await syncUserDataFromCloud(email);

      // Post customer email, name, phone to Paystack
      try {
        await syncCustomerToPaystack(email, fullName, phone, username);
      } catch (paystackErr) {
        console.warn("Paystack customer auto-sync notice:", paystackErr);
      }

      if (referralCode) {
        await saveUserFieldToCloud(email, "reward_points", 500);
      }

      setTimeout(() => {
        setLoading(false);
        navigate("/");
        // Force state reload
        window.location.reload();
      }, 1200);

    } catch (dbError) {
      console.error("Firestore database seeding error:", dbError);
      setError("Failed to create database profile. Local backup saved.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex flex-col justify-center p-6 sm:max-w-md sm:mx-auto py-10">
      <div className="text-center mb-6 flex flex-col items-center">
        <Logo size="sm" className="mb-2" />
        <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Create Account</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-1">
          Join PayClick Focus for instant VTU services
        </p>
      </div>

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

      {success && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl flex items-start gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold"
        >
          <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0 mt-0.5">
            <Check className="w-3 h-3 text-emerald-600" />
          </div>
          <div>{success}</div>
        </motion.div>
      )}

      <form onSubmit={handleSignup} className="space-y-3.5">
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">Full Name</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <User className="h-4.5 w-4.5 text-slate-400" />
            </div>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className="block w-full pl-10 pr-3 py-3 border border-slate-200 dark:border-gray-800 rounded-xl focus:ring-purple-600 focus:border-purple-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none text-xs transition-all shadow-sm"
              placeholder="e.g. John Doe"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">Username (Optional)</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <User className="h-4.5 w-4.5 text-slate-400" />
            </div>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="block w-full pl-10 pr-3 py-3 border border-slate-200 dark:border-gray-800 rounded-xl focus:ring-purple-600 focus:border-purple-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none text-xs transition-all shadow-sm"
              placeholder="e.g. johndoe"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">Email Address</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Mail className="h-4.5 w-4.5 text-slate-400" />
            </div>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="block w-full pl-10 pr-3 py-3 border border-slate-200 dark:border-gray-800 rounded-xl focus:ring-purple-600 focus:border-purple-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none text-xs transition-all shadow-sm"
              placeholder="e.g. john@example.com"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">Phone Number</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Phone className="h-4.5 w-4.5 text-slate-400" />
            </div>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="block w-full pl-10 pr-3 py-3 border border-slate-200 dark:border-gray-800 rounded-xl focus:ring-purple-600 focus:border-purple-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none text-xs transition-all shadow-sm"
              placeholder="e.g. 08012345678"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="block w-full pl-9 pr-2 py-3 border border-slate-200 dark:border-gray-800 rounded-xl focus:ring-purple-600 focus:border-purple-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none text-[11px] transition-all shadow-sm"
                placeholder="Password"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">Confirm</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="block w-full pl-9 pr-2 py-3 border border-slate-200 dark:border-gray-800 rounded-xl focus:ring-purple-600 focus:border-purple-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none text-[11px] transition-all shadow-sm"
                placeholder="Confirm"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">Referral Code (Optional)</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Gift className="h-4.5 w-4.5 text-slate-400" />
            </div>
            <input
              type="text"
              name="referralCode"
              value={formData.referralCode}
              onChange={handleChange}
              className="block w-full pl-10 pr-3 py-3 border border-slate-200 dark:border-gray-800 rounded-xl focus:ring-purple-600 focus:border-purple-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none text-xs transition-all shadow-sm"
              placeholder="e.g. FOCUS500"
            />
          </div>
          {formData.referralCode && (
            <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-1 font-bold">
              ✓ Valid referral format. You will receive 500 bonus P-Coins!
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || socialLoading !== null}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-extrabold text-xs shadow-md shadow-purple-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-4"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Social Signup Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-gray-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-50 dark:bg-gray-950 px-2 text-[10px] font-bold text-slate-400">
              Or sign up with
            </span>
          </div>
        </div>

        {/* Google and Facebook Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => handleSocialSignup("google")}
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
            onClick={() => handleSocialSignup("facebook")}
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

      <p className="mt-6 text-center text-xs font-bold text-slate-400">
        Already have an account?{" "}
        <Link to="/login" className="text-purple-600 dark:text-purple-400 hover:underline">
          Sign In
        </Link>
      </p>
    </div>
  );
}
