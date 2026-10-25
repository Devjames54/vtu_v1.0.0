import React, { useState, useEffect } from "react";
import { Download, Smartphone, X, CheckCircle2, ShieldCheck, Sparkles, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function AndroidInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if running as installed standalone app already
    const checkStandalone = window.matchMedia("(display-mode: standalone)").matches || 
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");
    
    setIsStandalone(checkStandalone);

    const ua = navigator.userAgent || "";
    setIsAndroid(/android/i.test(ua));

    // Listen to Android browser beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Listen to successful app installation
    window.addEventListener("appinstalled", () => {
      setIsStandalone(true);
      setInstallSuccess(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstallSuccess(true);
      }
      setDeferredPrompt(null);
    } else {
      // If browser doesn't expose deferred prompt (e.g. Chrome on some OS or already prompted)
      setShowModal(true);
    }
  };

  // Don't show if already running as standalone installed Android app
  if (isStandalone || isDismissed) {
    return null;
  }

  return (
    <>
      {/* Floating Android App Install Badge at the bottom right */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-40"
      >
        <div className="bg-gradient-to-r from-purple-900 via-purple-950 to-slate-950 border border-purple-500/40 rounded-2xl p-3.5 shadow-2xl shadow-purple-950/60 text-white flex items-center justify-between gap-3 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400/30 flex items-center justify-center shrink-0 text-emerald-400">
              <Smartphone className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-tight text-white">
                  PayClick for Android
                </span>
                <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black rounded-sm uppercase tracking-wider">
                  APK
                </span>
              </div>
              <p className="text-[10px] text-purple-200/80 leading-tight mt-0.5">
                Install as a standalone native Android app
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-md shadow-purple-600/30 flex items-center gap-1 whitespace-nowrap active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Android Installation Help Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl max-w-sm w-full p-6 text-slate-800 dark:text-white shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-black">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Install PayClick Android</h3>
                    <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">WebAPK & Native PWA Ready</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  PayClick is built with the latest Progressive Web Engine and WebAPK technology. You can install it on your Android phone without needing to download large APK files from outside:
                </p>

                <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50 rounded-2xl p-3.5 space-y-2">
                  <p className="font-bold text-purple-900 dark:text-purple-300 text-[11px] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    How to install on Android Chrome:
                  </p>
                  <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                    <li>Tap the <strong>three dots (⋮)</strong> in Chrome's top right corner.</li>
                    <li>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                    <li>Tap <strong>Install</strong>. Android will create the native APK icon on your home screen!</li>
                  </ol>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-gray-800 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[11px] text-slate-700 dark:text-slate-200">
                    <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Native Android Features Included:
                  </div>
                  <ul className="text-[10.5px] text-slate-500 dark:text-slate-400 space-y-0.5 pl-5 list-disc">
                    <li>Offline cache & instant startup</li>
                    <li>Full-screen standalone UI without address bar</li>
                    <li>Quick top-up shortcuts on app icon long-press</li>
                    <li>Biometric fingerprint & Face ID unlock</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-purple-600/20"
              >
                Got It
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
