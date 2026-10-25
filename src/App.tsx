/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import React, { useEffect, useState, useRef } from "react";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Welcome } from "./pages/Welcome";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ServiceForm } from "./pages/ServiceForm";
import { History } from "./pages/History";
import { Reward } from "./pages/Reward";
import { Account } from "./pages/Account";
import { Admin } from "./pages/Admin";
import { DiagnosticsPage } from "./pages/DiagnosticsPage";
import { Chatbot } from "./components/Chatbot";
import { AndroidInstallPrompt } from "./components/AndroidInstallPrompt";
import { Logo } from "./components/Logo";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { syncUserDataFromCloud } from "./lib/firebase";

// Scroll Restoration Utility
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

// Guard wrapper to protect routing pages
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const email = localStorage.getItem("vtu_user_email");
  if (!email) {
    const hasVisited = localStorage.getItem("vtu_has_visited_before") === "true";
    if (hasVisited) {
      return <Navigate to="/login" replace />;
    } else {
      return <Navigate to="/welcome" replace />;
    }
  }
  return <>{children}</>;
}

function AppContent() {
  const location = useLocation();
  const userEmail = localStorage.getItem("vtu_user_email");
  
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const lastPathRef = useRef(location.pathname);
  const [networkType, setNetworkType] = useState<string>("4G");
  const [latencyText, setLatencyText] = useState<string>("Optimizing connection...");

  // App initialization load
  useEffect(() => {
    const isDark = localStorage.getItem("vtu_dark_mode") === "true";
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Auto-clean any legacy dummy data from localStorage
    try {
      const isCleaned = localStorage.getItem("vtu_dummy_clean_v1");
      if (!isCleaned) {
        // 1. Purge dummy referred friends
        const refFriends = localStorage.getItem("vtu_referred_friends");
        if (refFriends) {
          const parsed = JSON.parse(refFriends);
          const dummyNames = ["Amara Nwachukwu", "Sarah Alabi", "Chinedu Okafor", "Gideon Balogun"];
          const cleaned = parsed.filter((f: any) => !dummyNames.some(d => f.name?.includes(d)));
          localStorage.setItem("vtu_referred_friends", JSON.stringify(cleaned));
        }

        // 2. Purge dummy transactions
        const txs = localStorage.getItem("vtu_transactions");
        if (txs) {
          const parsed = JSON.parse(txs);
          const dummyIds = ["TRX-831045", "TRX-109243", "TRX-774910", "REF-1782429340391"];
          const cleaned = parsed.filter((t: any) => 
            !dummyIds.includes(t.id) && 
            !t.id?.startsWith("DEP-WMA-") && 
            t.phoneOrMeter !== "Wema Transfer Hook" &&
            t.phoneOrMeter !== "Admin Seeder" &&
            t.provider?.name !== "Sandbox Deposit"
          );
          localStorage.setItem("vtu_transactions", JSON.stringify(cleaned));
        }

        // 3. Purge dummy notifications
        const notifs = localStorage.getItem("vtu_notifications_list");
        if (notifs) {
          const parsed = JSON.parse(notifs);
          const dummyTitles = ["Security Key Approved", "SME Data Discount Alert"];
          const cleaned = parsed.filter((n: any) => 
            !dummyTitles.includes(n.title) && 
            !n.body?.includes("Xiaomi Redmi Note 12")
          );
          localStorage.setItem("vtu_notifications_list", JSON.stringify(cleaned));
        }

        // 4. Remove fake contacts and reset dummy reward points if set
        localStorage.removeItem("vtu_contacts");
        if (localStorage.getItem("reward_points") === "1000" || localStorage.getItem("reward_points") === "1500") {
          localStorage.setItem("reward_points", "0");
        }
        if (localStorage.getItem("vtu_user_username") === "Mellzy" || localStorage.getItem("vtu_user_username") === "jaymesv") {
          localStorage.removeItem("vtu_user_username");
        }

        localStorage.setItem("vtu_dummy_clean_v1", "true");
      }
    } catch (e) {
      console.warn("Storage auto-cleaner encountered error:", e);
    }

    const startTime = Date.now();
    let isFinished = false;

    const finishLoading = () => {
      if (isFinished) return;
      isFinished = true;
      setIsAppLoading(false);
    };

    // 1. Force failback / maximum timeout at 20 seconds
    const maxTimeout = setTimeout(() => {
      console.warn("App loading timed out at 20s. Proceeding with offline fallback.");
      finishLoading();
    }, 20000);

    // 2. Perform synchronization if logged in, otherwise wait for min 2 seconds
    if (userEmail) {
      syncUserDataFromCloud(userEmail)
        .then(() => {
          console.log("App state synchronized with Firestore cloud database!");
        })
        .catch((err) => {
          console.error("Firebase startup synchronization error:", err);
        })
        .finally(() => {
          const elapsedTime = Date.now() - startTime;
          const remainingTime = Math.max(2000 - elapsedTime, 0);
          
          setTimeout(() => {
            clearTimeout(maxTimeout);
            finishLoading();
          }, remainingTime);
        });
    } else {
      // If not logged in, wait exactly 2 seconds for a clean presentation
      setTimeout(() => {
        clearTimeout(maxTimeout);
        finishLoading();
      }, 2000);
    }

    return () => {
      clearTimeout(maxTimeout);
    };
  }, [userEmail]);

  // Synchronize themes across different views using custom events
  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      const nextDark = customEvent.detail.isDark;
      if (nextDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };
    window.addEventListener("vtu-theme-changed", handleThemeChange);
    return () => {
      window.removeEventListener("vtu-theme-changed", handleThemeChange);
    };
  }, []);

  // Track page navigation changes to trigger page-switching progress bar
  useEffect(() => {
    if (location.pathname !== lastPathRef.current) {
      lastPathRef.current = location.pathname;
      setIsPageLoading(true);

      const startTime = Date.now();
      let isAborted = false;
      let activeTimer: NodeJS.Timeout | null = null;

      // Fast cache-busted fetch to inspect actual platform communication speeds
      const checkNetworkAndComplete = async () => {
        let rtt = 120; // assumed latency in ms
        try {
          const pingStart = Date.now();
          await fetch("/?cb=" + pingStart, { method: "HEAD", cache: "no-store" });
          rtt = Date.now() - pingStart;
        } catch (err) {
          console.warn("Real-time network ping test failed:", err);
          rtt = 1500; // high network resistance fallback
        }

        if (isAborted) return;

        // Retrieve hardware connections and dynamic cellular types
        const conn = (navigator as any).connection;
        const effectiveType = conn?.effectiveType || "4g";
        const downlink = conn?.downlink || 8; // in Mbps

        setNetworkType(effectiveType.toUpperCase());
        setLatencyText(`Connection latency: ${rtt}ms`);

        // Determine optimal load window based on network telemetry (fixed to exactly 2 seconds)
        let targetDuration = 2000;

        // Keep strictly bound within the [0ms, 2000ms] bounds
        targetDuration = Math.max(0, Math.min(targetDuration, 2000));

        const elapsed = Date.now() - startTime;
        const remaining = Math.max(targetDuration - elapsed, 0);

        activeTimer = setTimeout(() => {
          if (!isAborted) {
            setIsPageLoading(false);
          }
        }, remaining);
      };

      // Strict failure recovery: if transition exceeds 20 seconds, we fail back!
      const failbackTimeout = setTimeout(() => {
        if (!isAborted) {
          isAborted = true;
          setIsPageLoading(false);
          if (activeTimer) clearTimeout(activeTimer);
        }
      }, 20000);

      checkNetworkAndComplete();

      return () => {
        isAborted = true;
        clearTimeout(failbackTimeout);
        if (activeTimer) clearTimeout(activeTimer);
      };
    }
  }, [location.pathname]);

  if (isAppLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-200">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-purple-600/10 dark:bg-purple-600/15 blur-3xl -z-10"></div>
        <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full bg-purple-500/10 dark:bg-purple-500/15 blur-3xl -z-10"></div>
        
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-6 rounded-full bg-purple-500/20 dark:bg-purple-500/25 blur-2xl animate-pulse"></div>
          <Logo size="lg" hideText={true} className="animate-bounce" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-gray-950 transition-colors duration-200">
      <ScrollToTop />
      
      {/* Global Page Transition Loading Progress Overlay */}
      {isPageLoading && (
        <div className="fixed inset-0 z-[100] bg-slate-50/70 dark:bg-gray-950/70 backdrop-blur-md flex items-center justify-center">
          <div className="relative flex items-center justify-center p-8 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-3xl shadow-2xl">
            <div className="absolute -inset-4 rounded-full bg-purple-500/15 dark:bg-purple-500/20 blur-xl animate-pulse"></div>
            <Logo size="md" hideText={true} className="animate-bounce" />
          </div>
        </div>
      )}

      <Routes>
        {/* Onboarding welcome is public */}
        <Route path="/welcome" element={userEmail ? <Navigate to="/" replace /> : <Welcome />} />
        
        {/* Protected Core App routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        
        <Route path="/service/:id" element={
          <ProtectedRoute>
            <ServiceForm />
          </ProtectedRoute>
        } />
        
        <Route path="/service/:id/provider/:providerId" element={
          <ProtectedRoute>
            <ServiceForm />
          </ProtectedRoute>
        } />
        
        <Route path="/history" element={
          <ProtectedRoute>
            <History />
          </ProtectedRoute>
        } />
        
        <Route path="/reward" element={
          <ProtectedRoute>
            <Reward />
          </ProtectedRoute>
        } />
        
        <Route path="/account" element={
          <ProtectedRoute>
            <Account />
          </ProtectedRoute>
        } />
        
        <Route path="/admin" element={
          <ProtectedRoute>
            <Admin />
          </ProtectedRoute>
        } />

        <Route path="/diagnostics" element={
          <ProtectedRoute>
            <DiagnosticsPage />
          </ProtectedRoute>
        } />

        {/* Public Auth routes */}
        <Route path="/login" element={userEmail ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/signup" element={userEmail ? <Navigate to="/" replace /> : <Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Chatbot />
      <AndroidInstallPrompt />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AppContent />
      </Router>
    </ErrorBoundary>
  );
}
