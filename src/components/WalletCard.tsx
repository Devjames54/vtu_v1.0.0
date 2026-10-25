import { Eye, EyeOff, PlusCircle } from "lucide-react";
import { useState, useEffect } from "react";

export function WalletCard() {
  const [showBalance, setShowBalance] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch balance from our ClubKonnect API proxy
    const fetchBalance = async () => {
      try {
        const response = await fetch("/api/clubkonnect/wallet");
        const data = await response.json();
        const val = data?.balance ?? data?.Balance ?? 0;
        setBalance(typeof val === 'number' ? val : parseFloat(val) || 0);
      } catch (error) {
        console.error("Failed to fetch balance", error);
        setBalance(0.00);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, []);

  const formattedBalance = balance !== null ? `₦ ${balance.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "₦ 0.00";

  return (
    <div className="bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-950 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden border border-purple-500/20">
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-10"></div>
      <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-white opacity-10"></div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-purple-200 text-xs font-medium uppercase tracking-wider mb-1">Total Balance</p>
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-bold tracking-tight">
                {loading ? "Loading..." : (showBalance ? formattedBalance : "••••••••")}
              </h2>
              <button 
                onClick={() => setShowBalance(!showBalance)}
                className="text-purple-200 hover:text-white transition-colors p-1"
                disabled={loading}
              >
                {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-end mt-6">
          <div>
            <p className="text-purple-200 text-xs mb-1">Account Details</p>
            <p className="font-medium text-sm">James Gideon</p>
            <p className="text-purple-200 text-sm font-mono tracking-widest mt-0.5">1234 5678 90</p>
          </div>
          <button className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition-colors px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm">
            <PlusCircle className="w-4 h-4" />
            Fund Wallet
          </button>
        </div>
      </div>
    </div>
  );
}
