import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Gift, Sparkles, CheckCircle2, Star, Copy, Check, Users } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { cn } from "@/lib/utils";
import { saveUserFieldToCloud } from "@/lib/firebase";

interface ReferredFriend {
  id: string;
  name: string;
  email: string;
  date: string;
  bonus: number;
}

export function Reward() {
  const navigate = useNavigate();
  const [points, setPoints] = useState(() => {
    const saved = localStorage.getItem("reward_points");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [animationClass, setAnimationClass] = useState("");
  const [claimedStatus, setClaimedStatus] = useState<string | null>(null);

  // Refer-a-Friend state
  const [refSuffix, setRefSuffix] = useState(() => {
    const userEmail = localStorage.getItem("vtu_user_email") || "";
    const username = localStorage.getItem("vtu_user_username");
    if (username) return username.replace(/[^a-zA-Z0-9]/g, "");
    return userEmail.split("@")[0].replace(/[^a-zA-Z0-9]/g, "") || "user";
  });
  const [copied, setCopied] = useState(false);
  const [referredFriends, setReferredFriends] = useState<ReferredFriend[]>(() => {
    const saved = localStorage.getItem("vtu_referred_friends");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const email = localStorage.getItem("vtu_user_email") || "";

  useEffect(() => {
    localStorage.setItem("vtu_referred_friends", JSON.stringify(referredFriends));
    if (email) {
      saveUserFieldToCloud(email, "referred_friends", referredFriends);
    }
  }, [referredFriends, email]);

  useEffect(() => {
    localStorage.setItem("reward_points", points.toString());
    if (email) {
      saveUserFieldToCloud(email, "reward_points", points);
    }
  }, [points, email]);

  const referralLink = `${window.location.origin}/signup?ref=${refSuffix}`;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setClaimedStatus("Referral link copied to clipboard successfully!");
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleClearReferrals = () => {
    if (confirm("Are you sure you want to clear your referral list?")) {
      setReferredFriends([]);
      localStorage.setItem("vtu_referred_friends", JSON.stringify([]));
      if (email) {
        saveUserFieldToCloud(email, "referred_friends", []);
      }
      setClaimedStatus("Referral list cleared.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 pb-24 text-gray-800 dark:text-gray-100">
      {/* HEADER */}
      <header className="bg-gradient-to-r from-purple-700 via-purple-800 to-purple-950 text-white pt-4 pb-14 px-4 sticky top-0 z-10 shadow-xs">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate("/")}
            className="p-2 -ml-2 text-white/90 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-bold">PayClick Focus Rewards</h1>
        </div>

        {/* Brand points tracker */}
        <div className="mt-6 flex flex-col items-center text-center">
          <span className="text-xs font-bold text-purple-200 uppercase tracking-widest flex items-center gap-1.5 mb-1 bg-purple-900/40 px-3 py-1 rounded-full border border-purple-500/30">
            <Star className="w-3.5 h-3.5 fill-amber-300 stroke-none" />
            Your point balance
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className={cn("text-4xl font-extrabold tracking-tight transition-all", animationClass)}>
              {points.toLocaleString()}
            </span>
            <span className="text-sm font-semibold text-purple-200">P-Coins</span>
          </div>
          <p className="text-xs text-purple-200/80 mt-1">1 P-Coin = ₦1 dynamic cashback multiplier</p>
        </div>
      </header>

      <main className="px-4 max-w-md mx-auto -mt-8 relative z-20 space-y-4">
        {/* Status notification */}
        {claimedStatus && (
          <div className="bg-purple-600 text-white p-3.5 rounded-2xl text-xs font-bold shadow-md flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4.5 h-4.5 flex-shrink-0" />
            <span className="flex-1">{claimedStatus}</span>
            <button onClick={() => setClaimedStatus(null)} className="font-extrabold hover:opacity-80 px-1 text-sm">×</button>
          </div>
        )}

        {/* REFER A FRIEND SECTION */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-purple-100/60 dark:border-purple-900/30 space-y-4">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-50 dark:border-gray-850">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Refer a Friend & Earn</h3>
                <p className="text-[10px] text-slate-400">Receive +500 Coins for each signup</p>
              </div>
            </div>
            <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>

          <div className="space-y-3">
            {/* Suffix editing */}
            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold text-slate-400">Customized Referral Code</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={refSuffix}
                  onChange={(e) => setRefSuffix(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
                  placeholder="customcode"
                  className="bg-slate-50 dark:bg-slate-805 border border-slate-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white font-extrabold focus:outline-none focus:ring-1 focus:ring-purple-600 flex-1 font-mono uppercase tracking-wider"
                />
              </div>
            </div>

            {/* Generated referral link container */}
            <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/40 space-y-1.5">
              <p className="text-[9px] uppercase font-black text-purple-600 dark:text-purple-400 tracking-widest">Your Private Invite Link</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold truncate flex-1 font-mono select-all">
                  {referralLink}
                </p>
                <button
                  type="button"
                  onClick={copyReferralLink}
                  className="p-2 bg-white dark:bg-gray-800 border border-slate-200/65 dark:border-gray-700/80 rounded-lg text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 active:scale-95 transition-all text-xs flex items-center justify-center gap-1 font-bold whitespace-nowrap shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-[10px] text-emerald-600 font-bold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold">Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

          {/* Referred List tracking */}
          <div className="space-y-3 pt-3 border-t border-slate-50 dark:border-gray-850">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase font-bold text-slate-400 font-sans tracking-wider">
                Referred Friends ({referredFriends.length})
              </p>
              {referredFriends.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearReferrals}
                  className="text-[10px] font-bold text-rose-500 hover:underline"
                >
                  Clear List
                </button>
              )}
            </div>

            {referredFriends.length === 0 ? (
              <div className="text-center py-8 px-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-gray-800 space-y-2">
                <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No friends referred yet</p>
                <p className="text-[10.5px] text-slate-400 dark:text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Share your invite link with your family and friends. When they register, you earn 500 bonus points!
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-none">
                {referredFriends.map((f, i) => (
                  <div key={f.id || i} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950/30 rounded-xl border border-slate-100 dark:border-gray-850 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs uppercase">
                        {f.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-700 dark:text-slate-200">{f.name}</p>
                        <p className="text-[9px] text-slate-400">{f.email} • {f.date}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 font-mono bg-purple-50 dark:bg-purple-950/30 px-2 py-0.5 rounded">
                      +{f.bonus} Coins
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
