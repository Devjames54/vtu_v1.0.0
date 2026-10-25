import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Settings,
  Users,
  Smartphone,
  AlertTriangle,
  Percent,
  Wifi,
  Bell,
  Search,
  Lock,
  Unlock,
  Save,
  UserCheck,
  Coins,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  RefreshCw,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Activity,
  CreditCard,
  Layers,
  FileText,
  Plus,
  Trash2,
  Edit3,
  Globe,
  Radio,
  Zap,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  Server
} from "lucide-react";
import { db, saveUserFieldToCloud, syncCustomerToPaystack } from "../lib/firebase";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { serviceProviders } from "@/data/providers";
import { ApiDiagnosticsDashboard } from "@/components/ApiDiagnosticsDashboard";
import { 
  PaymentGatewayConfig, 
  AggregatorConfig, 
  ServiceRoutingConfig, 
  SystemConfig,
  defaultGateways,
  defaultAggregators,
  defaultServiceRouting
} from "@/types/admin";
import { PaymentGatewaysManager } from "@/components/admin/PaymentGatewaysManager";
import { AggregatorsManager } from "@/components/admin/AggregatorsManager";
import { AggregatorsMonitoring } from "@/components/admin/AggregatorsMonitoring";
import { ActivityLogsSection } from "@/components/admin/ActivityLogsSection";
import { logAdminActivity, getCachedAdminActivityLogs, subscribeToAdminActivityLogs } from "@/lib/activityLogger";

interface UserProfile {
  email: string;
  wallet_balance?: number;
  reward_points?: number;
  full_name?: string;
  phone?: string;
  username?: string;
  kyc_verified?: boolean;
  kyc_details?: {
    idType: string;
    idNumber: string;
    bvn?: string;
    nin?: string;
    verifiedAt: string;
  };
  transactions?: any[];
  notifications_list?: any[];
}

export function Admin() {
  const navigate = useNavigate();

  // Authentication check
  const [currentUserEmail] = useState(() => {
    return localStorage.getItem("vtu_user_email") || "";
  });

  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // System Config states with local storage fallback
  const [config, setConfig] = useState<SystemConfig>(() => {
    try {
      const cached = localStorage.getItem("vtu_admin_config");
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          ...parsed,
          gateways: parsed.gateways && parsed.gateways.length > 0 ? parsed.gateways : defaultGateways,
          aggregators: parsed.aggregators && parsed.aggregators.length > 0 ? parsed.aggregators : defaultAggregators,
          serviceRouting: parsed.serviceRouting || defaultServiceRouting
        };
      }
    } catch (e) {
      // ignore
    }
    return {
      maintenanceMode: false,
      globalDiscount: 2.5,
      apiLatency: 150,
      providerStatuses: {},
      systemAlert: "All services are fully active. Gateways & Aggregators connected.",
      localAdmins: [],
      clubkonnectUserId: "CK101290943",
      clubkonnectApiKey: "L771Q3F7698VHR08X3VJZW846P79135WD991JVP0379BN4MNORWE2D4BO0ZMTR31",
      paystackSecretKey: "sk_test_b8e59653ffe2ba5940bca226a2134e0fbcbbee92",
      paystackPublicKey: "pk_test_3ac926ffefcedbc1ed98990286d61a1348351537",
      gateways: defaultGateways,
      aggregators: defaultAggregators,
      serviceRouting: defaultServiceRouting
    };
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);
  const [configSaveNotice, setConfigSaveNotice] = useState<string | null>(null);
  const [showDiagnosticsDashboard, setShowDiagnosticsDashboard] = useState(false);

  // Live gateway test diagnostics
  const [testingGateways, setTestingGateways] = useState(false);
  const [gatewayReport, setGatewayReport] = useState<{
    testedAt: string;
    clubkonnect: { status: "success" | "warning" | "error"; message: string; balance?: string };
    paystack: { status: "success" | "warning" | "error"; message: string; publicKey?: string; balance?: string };
  } | null>(null);

  // User modification inputs
  const [balanceAdjustment, setBalanceAdjustment] = useState("");
  const [pointsAdjustment, setPointsAdjustment] = useState("");
  const [customKycVerified, setCustomKycVerified] = useState(false);
  const [kycBvn, setKycBvn] = useState("");
  const [kycNin, setKycNin] = useState("");
  const [userNotificationTitle, setUserNotificationTitle] = useState("");
  const [userNotificationBody, setUserNotificationBody] = useState("");
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Global broadcast inputs
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);

  // Navigation tab state: defaults to gateways & aggregators
  const isSuperAdmin = currentUserEmail.toLowerCase().trim() === "payclickfocus@gmail.com";
  const [activeAdminTab, setActiveAdminTab] = useState<"gateways" | "aggregators" | "monitoring" | "activity_logs" | "users" | "config" | "super">("gateways");
  const [activityLogCount, setActivityLogCount] = useState<number>(() => getCachedAdminActivityLogs().length);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [adminCreateEmail, setAdminCreateEmail] = useState("");
  const [adminCreateFullName, setAdminCreateFullName] = useState("");
  const [adminCreateUsername, setAdminCreateUsername] = useState("");
  const [adminCreatePhone, setAdminCreatePhone] = useState("");
  const [adminCreateBalance, setAdminCreateBalance] = useState("");
  const [adminCreatePassword, setAdminCreatePassword] = useState("");
  const [creationSuccessMsg, setCreationSuccessMsg] = useState<string | null>(null);
  const [creationErrorMsg, setCreationErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToAdminActivityLogs((logs) => {
      setActivityLogCount(logs.length);
    });
    return () => unsub();
  }, []);

  // Quick statistics
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBalance: 0,
    kycVerifiedCount: 0,
    offlineServicesCount: 0
  });

  // Check admin privileges
  useEffect(() => {
    const email = currentUserEmail.toLowerCase().trim();
    if (!email) {
      navigate("/login");
      return;
    }

    const isSuper = email === "payclickfocus@gmail.com";
    if (isSuper) {
      setIsAdminUser(true);
      return;
    }

    // Otherwise, load settings config to check localAdmins
    const configDocRef = doc(db, "system", "settings");
    getDoc(configDocRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.data() as SystemConfig;
        const localAdmins = data.localAdmins || [];
        const isLocal = localAdmins.map(e => e.toLowerCase().trim()).includes(email);
        if (isLocal) {
          setIsAdminUser(true);
        } else {
          console.warn("Unauthorised access attempt to admin console:", email);
          navigate("/");
        }
      } else {
        // Fallback
        navigate("/");
      }
    }).catch((err) => {
      console.error("Error checking admin privileges:", err);
      navigate("/");
    });
  }, [currentUserEmail, navigate]);

  // Load registered users and set up listener for real-time updates
  useEffect(() => {
    if (!isAdminUser) return;

    setLoadingUsers(true);
    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const list: UserProfile[] = [];
        let totalBal = 0;
        let verifiedCount = 0;

        snapshot.forEach((doc) => {
          const data = doc.data() as Omit<UserProfile, "email">;
          const userEmail = doc.id;
          const userObj: UserProfile = {
            email: userEmail,
            ...data
          };
          list.push(userObj);

          totalBal += data.wallet_balance || 0;
          if (data.kyc_verified) {
            verifiedCount++;
          }
        });

        setUsers(list);
        setFilteredUsers(list);
        setStats((prev) => ({
          ...prev,
          totalUsers: list.length,
          totalBalance: totalBal,
          kycVerifiedCount: verifiedCount
        }));
        setLoadingUsers(false);

        // Keep selected user reference fresh
        if (selectedUser) {
          const freshUser = list.find((u) => u.email === selectedUser.email);
          if (freshUser) {
            setSelectedUser(freshUser);
          }
        }
      },
      (error) => {
        console.error("Error loading users from firestore:", error);
        setLoadingUsers(false);
      }
    );

    return () => unsubscribe();
  }, [isAdminUser]);

  // Load global system configuration or write defaults
  useEffect(() => {
    if (!isAdminUser) return;

    const configDocRef = doc(db, "system", "settings");
    const unsubscribe = onSnapshot(configDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as SystemConfig;
        setConfig({
          ...data,
          localAdmins: data.localAdmins || [],
          gateways: data.gateways && data.gateways.length > 0 ? data.gateways : defaultGateways,
          aggregators: data.aggregators && data.aggregators.length > 0 ? data.aggregators : defaultAggregators,
          serviceRouting: data.serviceRouting || defaultServiceRouting
        });
        
        // Count offline providers
        const offlineCount = Object.values(data.providerStatuses || {}).filter(
          (status) => status === "offline"
        ).length;
        setStats((prev) => ({
          ...prev,
          offlineServicesCount: offlineCount
        }));
      } else {
        // Build initial config document in Firestore
        const defaultStatuses: Record<string, "online"> = {};
        Object.keys(serviceProviders).forEach((category) => {
          serviceProviders[category].forEach((prov) => {
            defaultStatuses[prov.id] = "online";
          });
        });

        const initialConfig: SystemConfig = {
          maintenanceMode: false,
          globalDiscount: 2.5,
          apiLatency: 120,
          providerStatuses: defaultStatuses,
          systemAlert: "All channels active. Multi-Gateway & Aggregator switchboard online.",
          localAdmins: [],
          gateways: defaultGateways,
          aggregators: defaultAggregators,
          serviceRouting: defaultServiceRouting
        };

        setDoc(configDocRef, initialConfig)
          .then(() => {
            setConfig(initialConfig);
          })
          .catch((err) => console.error("Could not write default configuration:", err));
      }
    });

    return () => unsubscribe();
  }, [isAdminUser]);

  // Handlers for Gateways & Aggregators management
  const handleUpdateGateways = (updated: PaymentGatewayConfig[]) => {
    const psk = updated.find(g => g.provider === "paystack");
    setConfig(prev => ({
      ...prev,
      gateways: updated,
      paystackPublicKey: psk?.publicKey || prev.paystackPublicKey,
      paystackSecretKey: psk?.secretKey || prev.paystackSecretKey
    }));
  };

  const handleUpdateAggregators = (updated: AggregatorConfig[]) => {
    const ck = updated.find(a => a.providerType === "clubkonnect");
    setConfig(prev => ({
      ...prev,
      aggregators: updated,
      clubkonnectUserId: ck?.userId || prev.clubkonnectUserId,
      clubkonnectApiKey: ck?.apiKey || prev.clubkonnectApiKey
    }));
  };

  const handleUpdateServiceRouting = (updated: ServiceRoutingConfig) => {
    setConfig(prev => ({
      ...prev,
      serviceRouting: updated
    }));
  };

  // Handle live user searching and filtering
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(
      (u) =>
        u.email.toLowerCase().includes(query) ||
        (u.full_name && u.full_name.toLowerCase().includes(query)) ||
        (u.username && u.username.toLowerCase().includes(query)) ||
        (u.phone && u.phone.includes(query))
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  // Select user and fill temporary form values
  const selectUserForEditing = (user: UserProfile) => {
    setSelectedUser(user);
    setBalanceAdjustment("");
    setPointsAdjustment("");
    setCustomKycVerified(user.kyc_verified || false);
    setKycBvn(user.kyc_details?.bvn || "");
    setKycNin(user.kyc_details?.nin || "");
    setUserNotificationTitle("");
    setUserNotificationBody("");
    setActionSuccessMessage(null);
  };

  // Adjust Wallet Balance of a chosen user
  const handleAdjustBalance = async () => {
    if (!selectedUser || !balanceAdjustment) return;
    const amount = parseFloat(balanceAdjustment);
    if (isNaN(amount)) return;

    try {
      const currentBalance = selectedUser.wallet_balance || 0;
      const newBalance = Math.max(0, currentBalance + amount);

      // Create transaction record representing the admin adjustment
      const txRef = `TX-ADM-${Date.now()}`;
      const newTx = {
        id: txRef,
        provider: {
          name: "Admin Adjustment",
          logo: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=64&q=80"
        },
        amount: Math.abs(amount),
        date: new Date().toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        }),
        phoneOrMeter: "Wallet Sync",
        status: "Successful",
        details: amount >= 0 
          ? `Credited ₦${amount.toFixed(2)} directly by System Administrator.` 
          : `Debited ₦${Math.abs(amount).toFixed(2)} directly by System Administrator.`
      };

      const freshTxs = selectedUser.transactions ? [...selectedUser.transactions] : [];
      freshTxs.unshift(newTx);

      // Appending notification item
      const newNotif = {
        id: `notif-${Date.now()}`,
        title: amount >= 0 ? "Wallet Credited 🏦" : "Wallet Debited 📉",
        body: amount >= 0 
          ? `Your wallet has been credited with ₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })} by the administrator.`
          : `Your wallet has been debited by ₦${Math.abs(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })} by the administrator.`,
        date: "Just now",
        read: false,
        type: amount >= 0 ? "success" : "alert"
      };
      const freshNotifs = selectedUser.notifications_list ? [...selectedUser.notifications_list] : [];
      freshNotifs.unshift(newNotif);

      // Update in cloud Firestore
      const userRef = doc(db, "users", selectedUser.email);
      await updateDoc(userRef, {
        wallet_balance: newBalance,
        transactions: freshTxs,
        notifications_list: freshNotifs,
        lastSynced: new Date().toISOString()
      });

      // Update local storage if editing oneself
      if (selectedUser.email.toLowerCase() === currentUserEmail.toLowerCase()) {
        localStorage.setItem("vtu_wallet_balance", newBalance.toFixed(2));
        localStorage.setItem("vtu_transactions", JSON.stringify(freshTxs));
        localStorage.setItem("vtu_notifications_list", JSON.stringify(freshNotifs));
        window.dispatchEvent(new Event("storage"));
      }

      setBalanceAdjustment("");
      triggerSuccessFeedback("Balance adjusted and user transactions updated successfully!");
    } catch (err) {
      console.error("Failed to adjust user balance:", err);
    }
  };

  // Adjust User Reward Points
  const handleAdjustPoints = async () => {
    if (!selectedUser || !pointsAdjustment) return;
    const points = parseInt(pointsAdjustment, 10);
    if (isNaN(points)) return;

    try {
      const currentPoints = selectedUser.reward_points || 0;
      const newPoints = Math.max(0, currentPoints + points);

      const userRef = doc(db, "users", selectedUser.email);
      await updateDoc(userRef, {
        reward_points: newPoints,
        lastSynced: new Date().toISOString()
      });

      if (selectedUser.email.toLowerCase() === currentUserEmail.toLowerCase()) {
        localStorage.setItem("reward_points", String(newPoints));
        window.dispatchEvent(new Event("storage"));
      }

      setPointsAdjustment("");
      triggerSuccessFeedback("User Reward Points successfully adjusted!");
    } catch (err) {
      console.error("Failed to adjust reward points:", err);
    }
  };

  // Adjust KYC Verification and details
  const handleSaveKycSettings = async () => {
    if (!selectedUser) return;

    try {
      const updatedDetails = {
        idType: "Admin Override",
        idNumber: kycNin || "ADM-OVERRIDE",
        bvn: kycBvn || "N/A",
        nin: kycNin || "N/A",
        verifiedAt: new Date().toISOString()
      };

      const userRef = doc(db, "users", selectedUser.email);
      await updateDoc(userRef, {
        kyc_verified: customKycVerified,
        kyc_details: customKycVerified ? updatedDetails : null,
        lastSynced: new Date().toISOString()
      });

      if (selectedUser.email.toLowerCase() === currentUserEmail.toLowerCase()) {
        localStorage.setItem("vtu_kyc_verified", String(customKycVerified));
        if (customKycVerified) {
          localStorage.setItem("vtu_kyc_details", JSON.stringify(updatedDetails));
        } else {
          localStorage.removeItem("vtu_kyc_details");
        }
        window.dispatchEvent(new Event("storage"));
      }

      triggerSuccessFeedback("KYC Verification settings updated instantly!");
    } catch (err) {
      console.error("Failed to save user KYC settings:", err);
    }
  };

  // Push personal notification to a user
  const handleSendUserNotification = async () => {
    if (!selectedUser || !userNotificationTitle || !userNotificationBody) return;

    try {
      const newNotif = {
        id: `notif-${Date.now()}`,
        title: userNotificationTitle,
        body: userNotificationBody,
        date: "Just now",
        read: false,
        type: "info"
      };

      const freshNotifs = selectedUser.notifications_list ? [...selectedUser.notifications_list] : [];
      freshNotifs.unshift(newNotif);

      const userRef = doc(db, "users", selectedUser.email);
      await updateDoc(userRef, {
        notifications_list: freshNotifs,
        lastSynced: new Date().toISOString()
      });

      if (selectedUser.email.toLowerCase() === currentUserEmail.toLowerCase()) {
        localStorage.setItem("vtu_notifications_list", JSON.stringify(freshNotifs));
        window.dispatchEvent(new Event("storage"));
      }

      setUserNotificationTitle("");
      setUserNotificationBody("");
      triggerSuccessFeedback("Notification saved to user inbox!");
    } catch (err) {
      console.error("Failed to send user notification:", err);
    }
  };

  // Broadcast Notification globally to ALL registered accounts
  const handleBroadcastNotification = async () => {
    if (!broadcastTitle || !broadcastBody) return;
    setBroadcasting(true);

    try {
      const broadcastNotif = {
        id: `broadcast-${Date.now()}`,
        title: `📢 ${broadcastTitle}`,
        body: broadcastBody,
        date: "Just now",
        read: false,
        type: "success"
      };

      // Append notification to each user document in Firestore asynchronously
      const promises = users.map(async (user) => {
        const freshNotifs = user.notifications_list ? [...user.notifications_list] : [];
        freshNotifs.unshift(broadcastNotif);
        const ref = doc(db, "users", user.email);
        return updateDoc(ref, {
          notifications_list: freshNotifs,
          lastSynced: new Date().toISOString()
        });
      });

      await Promise.all(promises);

      // Check if current user is in the list and append
      const myEmail = currentUserEmail.toLowerCase();
      const meInList = users.find((u) => u.email.toLowerCase() === myEmail);
      if (meInList) {
        const myLocalNotifs = localStorage.getItem("vtu_notifications_list");
        const list = myLocalNotifs ? JSON.parse(myLocalNotifs) : [];
        list.unshift(broadcastNotif);
        localStorage.setItem("vtu_notifications_list", JSON.stringify(list));
        window.dispatchEvent(new Event("storage"));
      }

      setBroadcastTitle("");
      setBroadcastBody("");
      triggerSuccessFeedback("System Broadcast successfully transmitted to all active users!");
    } catch (err) {
      console.error("Global system broadcast failure:", err);
    } finally {
      setBroadcasting(false);
    }
  };

  // Toggle active provider statuses (online/offline)
  const toggleProviderStatus = (providerId: string) => {
    const currentStatus = config.providerStatuses[providerId] || "online";
    const nextStatus = currentStatus === "online" ? "offline" : "online";

    setConfig((prev) => ({
      ...prev,
      providerStatuses: {
        ...prev.providerStatuses,
        [providerId]: nextStatus
      }
    }));
  };

  // Save global configuration adjustments
  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setConfigSuccess(false);
    setConfigSaveNotice(null);

    // 1. Immediately persist to localStorage
    try {
      localStorage.setItem("vtu_admin_config", JSON.stringify(config));
    } catch (e) {
      console.warn("Could not cache admin config to localStorage", e);
    }

    // 2. Persist to Firestore if reachable
    try {
      const configDocRef = doc(db, "system", "settings");
      await setDoc(configDocRef, {
        ...config,
        lastUpdated: new Date().toISOString()
      });
      setConfigSuccess(true);
      setConfigSaveNotice("Configuration saved to Cloud Firestore and local runtime!");
      setTimeout(() => setConfigSuccess(false), 4000);

      logAdminActivity({
        adminEmail: currentUserEmail,
        action: "system_save",
        targetType: "system",
        targetId: "system_settings",
        targetName: "System Configuration & Switchboard",
        summary: `Saved system settings: ${(config.gateways || []).length} gateways, ${(config.aggregators || []).length} aggregators, maintenance: ${config.maintenanceMode ? "ENABLED" : "DISABLED"}`,
        severity: "info"
      });
    } catch (err) {
      console.warn("Firestore offline or inaccessible. Saved to local runtime cache:", err);
      setConfigSuccess(true);
      setConfigSaveNotice("Saved to active runtime and local storage. (Offline fallback active)");
      setTimeout(() => setConfigSuccess(false), 4000);

      logAdminActivity({
        adminEmail: currentUserEmail,
        action: "system_save",
        targetType: "system",
        targetId: "system_settings",
        targetName: "System Configuration & Switchboard",
        summary: `Saved system settings to active runtime cache (offline fallback mode active)`,
        severity: "warning"
      });
    } finally {
      setSavingConfig(false);
    }
  };

  // Test live connection to ClubKonnect & Paystack
  const handleTestGateways = async () => {
    setTestingGateways(true);
    setGatewayReport(null);

    const report: any = {
      testedAt: new Date().toLocaleTimeString(),
      clubkonnect: { status: "warning", message: "Connecting to NelloByte ClubKonnect..." },
      paystack: { status: "warning", message: "Connecting to Paystack Gateway..." }
    };

    try {
      // 1. Test ClubKonnect
      try {
        const ckRes = await fetch("/api/clubkonnect/wallet");
        const ckData = await ckRes.json();
        if (ckRes.ok && (ckData.success || ckData.status === "ACCOUNT_MISMATCH")) {
          const bal = ckData.balance !== undefined ? ckData.balance : "0.00";
          report.clubkonnect = {
            status: Number(bal) > 0 ? "success" : "warning",
            balance: `₦${Number(bal).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`,
            message: Number(bal) > 0 
              ? `API Authenticated! Active wallet balance: ₦${bal}` 
              : `API Authenticated! Merchant balance is ₦${bal}. Fund on clubkonnect.com to dispense live VTU.`
          };
        } else {
          report.clubkonnect = {
            status: "error",
            message: ckData.error || ckData.message || "Failed to query ClubKonnect server."
          };
        }
      } catch (ckErr: any) {
        report.clubkonnect = {
          status: "error",
          message: ckErr.message || "ClubKonnect request failed"
        };
      }

      // 2. Test Paystack and fetch live balance
      try {
        const balRes = await fetch("/api/paystack/balance");
        const balData = await balRes.json();
        const pskRes = await fetch("/api/config/public");
        const pskData = await pskRes.json();

        if (balData.status) {
          const balanceFormatted = `₦${Number(balData.balance || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
          report.paystack = {
            status: "success",
            balance: balanceFormatted,
            publicKey: pskData.paystackPublicKey,
            message: `Paystack Live! Balance: ${balanceFormatted}. Webhook, Customer APIs & Checkouts Active.`
          };
        } else if (pskRes.ok && pskData.paystackPublicKey) {
          report.paystack = {
            status: "success",
            publicKey: pskData.paystackPublicKey,
            message: `Paystack Active! Public Key: ${pskData.paystackPublicKey.slice(0, 14)}... Ready to process deposits.`
          };
        } else {
          report.paystack = {
            status: "error",
            message: balData.message || "Paystack connection returned an unexpected response."
          };
        }
      } catch (pskErr: any) {
        report.paystack = {
          status: "error",
          message: pskErr.message || "Paystack test failed"
        };
      }

      setGatewayReport(report);
    } finally {
      setTestingGateways(false);
    }
  };

  const handleAddLocalAdmin = async () => {
    if (!newAdminEmail.trim() || !newAdminEmail.includes("@")) {
      triggerSuccessFeedback("Notice: Please enter a valid email address.");
      return;
    }
    const emailToAdd = newAdminEmail.trim().toLowerCase();
    const currentAdmins = config.localAdmins ? [...config.localAdmins] : [];
    if (currentAdmins.includes(emailToAdd)) {
      triggerSuccessFeedback("Notice: This email is already a designated admin.");
      return;
    }
    const updatedAdmins = [...currentAdmins, emailToAdd];
    
    try {
      const configDocRef = doc(db, "system", "settings");
      await updateDoc(configDocRef, {
        localAdmins: updatedAdmins
      });
      setNewAdminEmail("");
      triggerSuccessFeedback(`Added ${emailToAdd} as Local Admin!`);
    } catch (err) {
      console.error("Error adding local admin:", err);
      triggerSuccessFeedback("Failed to update database admin list.");
    }
  };

  const handleRemoveLocalAdmin = async (emailToRemove: string) => {
    if (window.confirm(`Are you sure you want to revoke Admin access for ${emailToRemove}?`)) {
      const currentAdmins = config.localAdmins ? [...config.localAdmins] : [];
      const updatedAdmins = currentAdmins.filter(e => e.toLowerCase().trim() !== emailToRemove.toLowerCase().trim());
      
      try {
        const configDocRef = doc(db, "system", "settings");
        await updateDoc(configDocRef, {
          localAdmins: updatedAdmins
        });
        triggerSuccessFeedback(`Revoked admin access for ${emailToRemove}`);
      } catch (err) {
        console.error("Error removing local admin:", err);
        triggerSuccessFeedback("Failed to update database admin list.");
      }
    }
  };

  const handleAdminCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreationErrorMsg(null);
    setCreationSuccessMsg(null);

    const email = adminCreateEmail.trim().toLowerCase();
    const fullName = adminCreateFullName.trim();
    const username = adminCreateUsername.trim();
    const phone = adminCreatePhone.trim();
    const balanceVal = parseFloat(adminCreateBalance) || 0;
    const password = adminCreatePassword;

    if (!email || !fullName || !password) {
      setCreationErrorMsg("Email, Full Name, and Password are required.");
      return;
    }

    try {
      // Check if user already exists
      const userRef = doc(db, "users", email);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setCreationErrorMsg("Account already exists with this email address.");
        return;
      }

      // Initialize user document directly in Firestore
      const newUserProfile = {
        email: email,
        full_name: fullName,
        username: username || email.split("@")[0],
        phone: phone || "",
        wallet_balance: balanceVal,
        reward_points: 1000,
        kyc_verified: false,
        password: password, // Store password for secure fallback login in Login.tsx
        referred_friends: [],
        notifications_list: [{
          id: `welcome-${Date.now()}`,
          title: "Account Created! 🎉",
          body: `Hi ${fullName}, your account has been created directly by the Super Administrator. Welcome to PayClick!`,
          date: "Just now",
          read: false,
          type: "success"
        }],
        transactions: [],
        lastSynced: new Date().toISOString()
      };

      await setDoc(userRef, newUserProfile);

      // Post customer email, name, phone to Paystack
      syncCustomerToPaystack(email, fullName, phone, username).catch(err => {
        console.warn("Paystack sync notice during admin account creation:", err);
      });

      setCreationSuccessMsg(`Account successfully created for ${fullName} and registered with Paystack!`);
      
      // Clear fields
      setAdminCreateEmail("");
      setAdminCreateFullName("");
      setAdminCreateUsername("");
      setAdminCreatePhone("");
      setAdminCreateBalance("");
      setAdminCreatePassword("");
    } catch (err) {
      console.error("Error creating user directly:", err);
      setCreationErrorMsg("Failed to create account directly in Firestore users collection.");
    }
  };

  const triggerSuccessFeedback = (message: string) => {
    setActionSuccessMessage(message);
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  if (!isAdminUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-gray-950">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-purple-600 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-500">Redirecting to secure terminal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 pb-24 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* HEADER BAR */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-slate-100 dark:border-gray-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/account")}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-base font-black tracking-tight flex items-center gap-1.5 text-slate-950 dark:text-white">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              PayClick Admin Console
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Control Panel • Root Privileges
            </p>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse">
          ROOT ACCESS ACTIVE
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* QUICK STATUS ANALYTICS METRICS (CLICKABLE TO SWITCH TABS) */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <button
            onClick={() => setActiveAdminTab("users")}
            className="text-left bg-white dark:bg-gray-900 p-4 rounded-2xl border border-slate-100 dark:border-gray-850 shadow-xs hover:border-purple-600 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 dark:text-gray-500 font-black uppercase tracking-wider">
                  Total Users
                </p>
                <h3 className="text-lg font-extrabold font-mono mt-0.5">{stats.totalUsers}</h3>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveAdminTab("gateways")}
            className="text-left bg-white dark:bg-gray-900 p-4 rounded-2xl border border-slate-100 dark:border-gray-850 shadow-xs hover:border-purple-600 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 dark:text-gray-500 font-black uppercase tracking-wider">
                  Gateways Active
                </p>
                <h3 className="text-lg font-extrabold font-mono mt-0.5">
                  {(config.gateways || defaultGateways).filter(g => g.status === "active").length} / {(config.gateways || defaultGateways).length}
                </h3>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveAdminTab("aggregators")}
            className="text-left bg-white dark:bg-gray-900 p-4 rounded-2xl border border-slate-100 dark:border-gray-850 shadow-xs hover:border-purple-600 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 dark:text-gray-500 font-black uppercase tracking-wider">
                  Aggregators
                </p>
                <h3 className="text-lg font-extrabold font-mono mt-0.5">
                  {(config.aggregators || defaultAggregators).filter(a => a.status === "active").length} / {(config.aggregators || defaultAggregators).length}
                </h3>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveAdminTab("monitoring")}
            className="text-left bg-white dark:bg-gray-900 p-4 rounded-2xl border border-slate-100 dark:border-gray-850 shadow-xs hover:border-emerald-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 dark:text-gray-500 font-black uppercase tracking-wider">
                  Live Telemetry
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <h3 className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 font-mono">
                    Operational
                  </h3>
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveAdminTab("activity_logs")}
            className="text-left bg-white dark:bg-gray-900 p-4 rounded-2xl border border-slate-100 dark:border-gray-850 shadow-xs hover:border-amber-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 dark:text-gray-500 font-black uppercase tracking-wider">
                  Activity Logs
                </p>
                <h3 className="text-lg font-extrabold font-mono mt-0.5">{activityLogCount} Entries</h3>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveAdminTab("config")}
            className="text-left bg-white dark:bg-gray-900 p-4 rounded-2xl border border-slate-100 dark:border-gray-850 shadow-xs hover:border-rose-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 dark:text-gray-500 font-black uppercase tracking-wider">
                  Offline Channels
                </p>
                <h3 className="text-lg font-extrabold font-mono mt-0.5">{stats.offlineServicesCount}</h3>
              </div>
            </div>
          </button>
        </section>

        {/* PRIMARY ADMIN NAVIGATION BAR */}
        <div className="flex items-center gap-1.5 p-1.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl overflow-x-auto shadow-xs">
          <button
            onClick={() => setActiveAdminTab("gateways")}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeAdminTab === "gateways"
                ? "bg-purple-600 text-white shadow-sm shadow-purple-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Payment Gateways</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
              activeAdminTab === "gateways" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-gray-800 text-slate-700 dark:text-slate-300"
            }`}>
              {(config.gateways || defaultGateways).filter(g => g.status === "active").length}
            </span>
          </button>

          <button
            onClick={() => setActiveAdminTab("aggregators")}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeAdminTab === "aggregators"
                ? "bg-purple-600 text-white shadow-sm shadow-purple-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Aggregators & Routing</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
              activeAdminTab === "aggregators" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-gray-800 text-slate-700 dark:text-slate-300"
            }`}>
              {(config.aggregators || defaultAggregators).filter(a => a.status === "active").length}
            </span>
          </button>

          <button
            onClick={() => setActiveAdminTab("monitoring")}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeAdminTab === "monitoring"
                ? "bg-purple-600 text-white shadow-sm shadow-purple-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800"
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Real-Time Health & Ping</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </button>

          <button
            onClick={() => setActiveAdminTab("activity_logs")}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeAdminTab === "activity_logs"
                ? "bg-purple-600 text-white shadow-sm shadow-purple-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Activity Logs</span>
            {activityLogCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                activeAdminTab === "activity_logs" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-gray-800 text-slate-700 dark:text-slate-300"
              }`}>
                {activityLogCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveAdminTab("users")}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeAdminTab === "users"
                ? "bg-purple-600 text-white shadow-sm shadow-purple-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Accounts</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
              activeAdminTab === "users" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-gray-800 text-slate-700 dark:text-slate-300"
            }`}>
              {users.length}
            </span>
          </button>

          <button
            onClick={() => setActiveAdminTab("config")}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeAdminTab === "config"
                ? "bg-purple-600 text-white shadow-sm shadow-purple-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>VTU Engine & Switchboard</span>
          </button>

          {isSuperAdmin && (
            <button
              onClick={() => setActiveAdminTab("super")}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeAdminTab === "super"
                  ? "bg-amber-500 text-slate-950 shadow-sm font-extrabold"
                  : "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Super Admin</span>
            </button>
          )}
        </div>

        {/* TAB 1: PAYMENT GATEWAYS CONTROLS */}
        {activeAdminTab === "gateways" && (
          <div className="animate-fade-in">
            <PaymentGatewaysManager
              gateways={config.gateways || defaultGateways}
              adminEmail={currentUserEmail}
              onUpdateGateways={(updated) => {
                setConfig(prev => {
                  const nextConfig = { ...prev, gateways: updated };
                  const psk = updated.find(g => g.provider === "paystack");
                  if (psk) {
                    if (psk.publicKey) nextConfig.paystackPublicKey = psk.publicKey;
                    if (psk.secretKey) nextConfig.paystackSecretKey = psk.secretKey;
                  }
                  return nextConfig;
                });
              }}
              onSaveToCloud={handleSaveConfig}
              isSaving={savingConfig}
            />
          </div>
        )}

        {/* TAB 2: AGGREGATORS & ROUTING CONTROLS */}
        {activeAdminTab === "aggregators" && (
          <div className="animate-fade-in">
            <AggregatorsManager
              aggregators={config.aggregators || defaultAggregators}
              serviceRouting={config.serviceRouting || defaultServiceRouting}
              adminEmail={currentUserEmail}
              onNavigateToMonitoring={() => setActiveAdminTab("monitoring")}
              onUpdateAggregators={(updated) => {
                setConfig(prev => {
                  const nextConfig = { ...prev, aggregators: updated };
                  const ck = updated.find(a => a.providerType === "clubkonnect");
                  if (ck) {
                    if (ck.userId) nextConfig.clubkonnectUserId = ck.userId;
                    if (ck.apiKey) nextConfig.clubkonnectApiKey = ck.apiKey;
                  }
                  return nextConfig;
                });
              }}
              onUpdateServiceRouting={(updated) => {
                setConfig(prev => ({ ...prev, serviceRouting: updated }));
              }}
              onSaveToCloud={handleSaveConfig}
              isSaving={savingConfig}
            />
          </div>
        )}

        {/* TAB: REAL-TIME HEALTH & RESPONSE TIME MONITORING */}
        {activeAdminTab === "monitoring" && (
          <div className="animate-fade-in">
            <AggregatorsMonitoring
              aggregators={config.aggregators || defaultAggregators}
              serviceRouting={config.serviceRouting || defaultServiceRouting}
            />
          </div>
        )}

        {/* TAB: ADMINISTRATOR ACTIVITY & AUDIT LOGS */}
        {activeAdminTab === "activity_logs" && (
          <div className="animate-fade-in">
            <ActivityLogsSection
              currentUserEmail={currentUserEmail}
            />
          </div>
        )}

        {/* TAB 3: USER ACCOUNTS & MANAGEMENT */}
        {activeAdminTab === "users" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
            {/* LEFT: USER LIST AND QUICK VIEW ACTIONS (8 COLUMNS) */}
            <section className="lg:col-span-8 space-y-6">
            {/* REGISTERED USERS MANAGEMENT BOX */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-50 dark:border-gray-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h2 className="text-sm font-black text-slate-900 dark:text-white font-sans">
                    Registered Accounts Database
                  </h2>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search email, name or phone..."
                    className="w-full sm:w-64 bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:ring-purple-600 focus:outline-none focus:ring-1"
                  />
                </div>
              </div>

              {loadingUsers ? (
                <div className="p-12 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-400">Loading user profiles from Firestore...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Users className="w-12 h-12 stroke-[1] mx-auto mb-2 opacity-55" />
                  <p className="text-xs font-bold">No active users match this query.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-gray-950/50 text-[10px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-gray-850">
                      <tr>
                        <th className="px-4 py-3">User Profile</th>
                        <th className="px-4 py-3">Contact</th>
                        <th className="px-4 py-3 font-mono text-right">Balance</th>
                        <th className="px-4 py-3 text-center">KYC Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-gray-850">
                      {filteredUsers.map((user) => (
                        <tr
                          key={user.email}
                          onClick={() => selectUserForEditing(user)}
                          className={`cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-gray-850/40 ${
                            selectedUser?.email === user.email ? "bg-purple-500/10 dark:bg-purple-500/15" : ""
                          }`}
                        >
                          <td className="px-4 py-3.5">
                            <div className="font-extrabold text-slate-900 dark:text-white max-w-[180px] truncate">
                              {user.full_name || user.username || "Anonymous User"}
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-gray-500 font-medium truncate max-w-[180px]">
                              {user.email}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">
                            <div className="font-bold">{user.phone || "No Phone"}</div>
                            <div className="text-[9px] font-mono text-slate-400">UID: {user.email.split("@")[0]}</div>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-right text-slate-900 dark:text-white font-extrabold">
                            ₦{(user.wallet_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {user.kyc_verified ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
                                <CheckCircle2 className="w-3 h-3" /> VERIFIED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-gray-800 text-slate-400 dark:text-gray-500 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
                                <XCircle className="w-3 h-3" /> PENDING
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                selectUserForEditing(user);
                              }}
                              className="text-[10px] font-extrabold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-lg hover:bg-purple-600 hover:text-white transition-all active:scale-95 cursor-pointer"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* EXPANDED INDIVIDUAL USER MANAGEMENT FORM CONTROL TERMINAL */}
            {selectedUser && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm overflow-hidden animate-fade-in">
                <div className="p-4 bg-slate-50 dark:bg-gray-950 border-b border-slate-100 dark:border-gray-850 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4.5 h-4.5 text-amber-500" />
                    <h3 className="text-xs font-black text-slate-900 dark:text-white font-sans uppercase tracking-wider">
                      Managing: {selectedUser.email}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Close Panel
                  </button>
                </div>

                {actionSuccessMessage && (
                  <div className="m-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4.5 h-4.5 shrink-0" />
                    {actionSuccessMessage}
                  </div>
                )}

                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* ADJUST WALLET BALANCE CONTAINER */}
                  <div className="space-y-3 p-4 bg-slate-50 dark:bg-gray-950/40 border border-slate-100 dark:border-gray-850 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">Adjust Wallet Balance</h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Current: ₦{(selectedUser.wallet_balance || 0).toFixed(2)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-400">
                          ₦
                        </span>
                        <input
                          type="number"
                          value={balanceAdjustment}
                          onChange={(e) => setBalanceAdjustment(e.target.value)}
                          placeholder="Amount (e.g., 5000 or -2500)"
                          className="w-full bg-white dark:bg-gray-900 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl pl-8 pr-3 py-2 text-xs focus:ring-purple-600 focus:outline-none focus:ring-1"
                        />
                      </div>
                      <p className="text-[9px] text-slate-400 font-medium leading-tight">
                        Use positive values to Credit and negative values to Debit. Adjustments generate direct, formal system credit transactions automatically.
                      </p>
                      <button
                        onClick={handleAdjustBalance}
                        className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-xs cursor-pointer shadow-purple-500/20"
                      >
                        Adjust Balance
                      </button>
                    </div>
                  </div>

                  {/* ADJUST REWARD POINTS CONTAINER */}
                  <div className="space-y-3 p-4 bg-slate-50 dark:bg-gray-950/40 border border-slate-100 dark:border-gray-850 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">Adjust Reward Points</h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Current: {(selectedUser.reward_points || 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <input
                        type="number"
                        value={pointsAdjustment}
                        onChange={(e) => setPointsAdjustment(e.target.value)}
                        placeholder="Points (e.g., 200 or -500)"
                        className="w-full bg-white dark:bg-gray-900 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3.5 py-2 text-xs focus:ring-purple-600 focus:outline-none focus:ring-1"
                      />
                      <p className="text-[9px] text-slate-400 font-medium leading-tight">
                        Increase or decrease user loyalty rewards points used for buying discounted packages or claiming promotional credit.
                      </p>
                      <button
                        onClick={handleAdjustPoints}
                        className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-xs cursor-pointer shadow-purple-500/20"
                      >
                        Adjust Points
                      </button>
                    </div>
                  </div>

                  {/* KYC DETAILS OVERRIDE CONTROL */}
                  <div className="space-y-3.5 p-4 bg-slate-50 dark:bg-gray-950/40 border border-slate-100 dark:border-gray-850 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">KYC Compliance Override</h4>
                      <button
                        onClick={() => setCustomKycVerified(!customKycVerified)}
                        className="text-slate-600 dark:text-slate-300 hover:text-purple-600 transition-colors"
                      >
                        {customKycVerified ? (
                          <ToggleRight className="w-10 h-10 text-emerald-500 stroke-[1.25]" />
                        ) : (
                          <ToggleLeft className="w-10 h-10 text-slate-300 dark:text-slate-600 stroke-[1.25]" />
                        )}
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                          Bank Verification Number (BVN - 11 Digits)
                        </label>
                        <input
                          type="text"
                          value={kycBvn}
                          onChange={(e) => setKycBvn(e.target.value)}
                          placeholder="Bank Verification Number"
                          className="w-full bg-white dark:bg-gray-900 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-1.5 text-xs focus:ring-purple-600 focus:outline-none focus:ring-1"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                          National Identity Number (NIN - 11 Digits)
                        </label>
                        <input
                          type="text"
                          value={kycNin}
                          onChange={(e) => setKycNin(e.target.value)}
                          placeholder="National Identification Number"
                          className="w-full bg-white dark:bg-gray-900 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-1.5 text-xs focus:ring-purple-600 focus:outline-none focus:ring-1"
                        />
                      </div>
                      <button
                        onClick={handleSaveKycSettings}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl transition-all shadow-xs"
                      >
                        Apply KYC Update
                      </button>
                    </div>
                  </div>

                  {/* DIRECT DISPATCH IN-APP NOTIFICATION */}
                  <div className="space-y-3 p-4 bg-slate-50 dark:bg-gray-950/40 border border-slate-100 dark:border-gray-850 rounded-2xl">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                      <Bell className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      Send In-App Notification
                    </h4>

                    <div className="space-y-2.5">
                      <input
                        type="text"
                        value={userNotificationTitle}
                        onChange={(e) => setUserNotificationTitle(e.target.value)}
                        placeholder="Alert Title (e.g., Security Update)"
                        className="w-full bg-white dark:bg-gray-900 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-1.5 text-xs focus:ring-purple-600 focus:outline-none focus:ring-1"
                      />
                      <textarea
                        value={userNotificationBody}
                        onChange={(e) => setUserNotificationBody(e.target.value)}
                        placeholder="Type notification text..."
                        rows={2}
                        className="w-full bg-white dark:bg-gray-900 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-1.5 text-xs focus:ring-purple-600 focus:outline-none focus:ring-1"
                      />
                      <button
                        onClick={handleSendUserNotification}
                        className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-xs cursor-pointer shadow-purple-500/20"
                      >
                        Send Notification
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* RIGHT COLUMN: DIRECT USER PROVISIONING */}
          <section className="lg:col-span-4 space-y-6">
            <form onSubmit={handleAdminCreateAccount} className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm overflow-hidden p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-50 dark:border-gray-850 pb-3">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h2 className="text-sm font-black text-slate-900 dark:text-white font-sans">
                  Provision User
                </h2>
              </div>

              <p className="text-[10px] text-slate-400 leading-tight">
                Instantly provision an account in the Firestore database with pre-loaded balance.
              </p>

              {creationErrorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl">
                  {creationErrorMsg}
                </div>
              )}

              {creationSuccessMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl">
                  {creationSuccessMsg}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={adminCreateEmail}
                    onChange={(e) => setAdminCreateEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-1.5 text-xs focus:ring-purple-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    required
                    value={adminCreateFullName}
                    onChange={(e) => setAdminCreateFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-1.5 text-xs focus:ring-purple-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={adminCreateUsername}
                      onChange={(e) => setAdminCreateUsername(e.target.value)}
                      placeholder="johndoe"
                      className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-1.5 text-xs focus:ring-purple-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={adminCreatePhone}
                      onChange={(e) => setAdminCreatePhone(e.target.value)}
                      placeholder="08031234567"
                      className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-1.5 text-xs focus:ring-purple-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                      Initial Balance (₦)
                    </label>
                    <input
                      type="number"
                      value={adminCreateBalance}
                      onChange={(e) => setAdminCreateBalance(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-1.5 text-xs focus:ring-purple-600 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={adminCreatePassword}
                      onChange={(e) => setAdminCreatePassword(e.target.value)}
                      placeholder="Min 6 chars"
                      className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-1.5 text-xs focus:ring-purple-600 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer shadow-purple-500/20"
                >
                  Create User
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* TAB 4: VTU ENGINE & SYSTEM CONFIGURATION */}
      {activeAdminTab === "config" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
          {/* VTU ENGINE CONFIGURATION (7 COLS) */}
          <div className="lg:col-span-7 space-y-6">
            {/* GLOBAL SYSTEM CONFIGURATION SETTINGS BOX */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-50 dark:border-gray-850 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Settings className="w-5 h-5 text-amber-500" />
                      <h2 className="text-sm font-black text-slate-900 dark:text-white font-sans">
                        Global VTU Engine Config
                      </h2>
                    </div>
                    {savingConfig && <Loader2 className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-spin" />}
                  </div>

                  {configSuccess && (
                    <div className="mx-4 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Config saved globally!
                    </div>
                  )}

                  <div className="p-4 space-y-4">
                    {/* 1. MAINTENANCE MODE TOGGLE */}
                    <div className="flex items-center justify-between py-1 bg-slate-50 dark:bg-gray-950/50 p-3 rounded-xl border border-slate-100 dark:border-gray-850">
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white">System Maintenance</h3>
                        <p className="text-[10px] text-slate-400">Lock general client access</p>
                      </div>
                      <button
                        onClick={() => setConfig((prev) => ({ ...prev, maintenanceMode: !prev.maintenanceMode }))}
                        className="text-slate-600 dark:text-slate-300 hover:text-purple-600 transition-colors"
                      >
                        {config.maintenanceMode ? (
                          <ToggleRight className="w-10 h-10 text-amber-500 stroke-[1.25]" />
                        ) : (
                          <ToggleLeft className="w-10 h-10 text-slate-300 dark:text-slate-600 stroke-[1.25]" />
                        )}
                      </button>
                    </div>

                    {/* 2. GLOBAL COMMISSION DISCOUNT RATE */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5" />
                        Global VTU User Discount (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={config.globalDiscount}
                        onChange={(e) => setConfig((prev) => ({ ...prev, globalDiscount: parseFloat(e.target.value) || 0 }))}
                        className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:ring-purple-600 focus:outline-none focus:ring-1"
                      />
                      <p className="text-[9px] text-slate-400 leading-tight">
                        Discount percentage automatically credited back to user wallets upon successful checkout of services.
                      </p>
                    </div>

                    {/* 3. GATEWAY LATENCY BUFFER */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Wifi className="w-3.5 h-3.5" />
                        Gateway Response Timeout Buffer (ms)
                      </label>
                      <input
                        type="number"
                        value={config.apiLatency}
                        onChange={(e) => setConfig((prev) => ({ ...prev, apiLatency: parseInt(e.target.value, 10) || 0 }))}
                        className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:ring-purple-600 focus:outline-none focus:ring-1"
                      />
                      <p className="text-[9px] text-slate-400 leading-tight">
                        Maximum buffer time in milliseconds for external cellular gateway provider responses.
                      </p>
                    </div>

                    {/* 4. BROADCAST SYSTEM ALERT BANNER */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Smartphone className="w-3.5 h-3.5" />
                        Global System Alert Banner
                      </label>
                      <textarea
                        value={config.systemAlert}
                        onChange={(e) => setConfig((prev) => ({ ...prev, systemAlert: e.target.value }))}
                        rows={2}
                        className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:ring-purple-600 focus:outline-none focus:ring-1"
                      />
                      <p className="text-[9px] text-slate-400 leading-tight">
                        Updates the scrolling system notification ribbon at the top of the user dashboard in real-time.
                      </p>
                    </div>

                    {/* 5. NELLOBYTE / CLUBKONNECT API CREDENTIALS */}
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-gray-800">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                        NelloByte / ClubKonnect Gateway Credentials
                      </label>
                      <div className="space-y-2">
                        <div>
                          <p className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 mb-1">User ID (Mobile Number / Account ID)</p>
                          <input
                            type="text"
                            placeholder="e.g. 08012345678"
                            value={config.clubkonnectUserId || ""}
                            onChange={(e) => setConfig((prev) => ({ ...prev, clubkonnectUserId: e.target.value }))}
                            className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:ring-purple-600 focus:outline-none focus:ring-1 font-mono"
                          />
                        </div>
                        <div>
                          <p className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 mb-1">API Key</p>
                          <input
                            type="password"
                            placeholder="Your NelloByte / ClubKonnect API Key"
                            value={config.clubkonnectApiKey || ""}
                            onChange={(e) => setConfig((prev) => ({ ...prev, clubkonnectApiKey: e.target.value }))}
                            className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:ring-purple-600 focus:outline-none focus:ring-1 font-mono"
                          />
                        </div>
                      </div>
                      <p className="text-[9px] text-slate-400 leading-tight">
                        Saved credentials are automatically loaded for live airtime, data, cables, and electricity API calls.
                      </p>
                    </div>

                    {/* 6. PAYSTACK PAYMENT GATEWAY CREDENTIALS */}
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-gray-800">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-[#0ba4db]" />
                        Paystack Gateway Credentials
                      </label>
                      <div className="space-y-2">
                        <div>
                          <p className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 mb-1">Paystack Secret Key</p>
                          <input
                            type="password"
                            placeholder="sk_test_... or sk_live_..."
                            value={config.paystackSecretKey || ""}
                            onChange={(e) => setConfig((prev) => ({ ...prev, paystackSecretKey: e.target.value }))}
                            className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:ring-[#0ba4db] focus:outline-none focus:ring-1 font-mono"
                          />
                        </div>
                        <div>
                          <p className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 mb-1">Paystack Public Key</p>
                          <input
                            type="text"
                            placeholder="pk_test_... or pk_live_..."
                            value={config.paystackPublicKey || ""}
                            onChange={(e) => setConfig((prev) => ({ ...prev, paystackPublicKey: e.target.value }))}
                            className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:ring-[#0ba4db] focus:outline-none focus:ring-1 font-mono"
                          />
                        </div>
                      </div>
                      <p className="text-[9px] text-slate-400 leading-tight">
                        Powers all deposit channels: Cards, Bank Transfer, USSD, and QR payments.
                      </p>
                    </div>

                    {/* LIVE GATEWAY DIAGNOSTICS & TEST SUITE */}
                    <div className="p-3.5 bg-purple-950/20 dark:bg-purple-950/40 border border-purple-500/30 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Wifi className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                            Live Gateway Connectivity
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowDiagnosticsDashboard(true)}
                            className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shadow-purple-500/20"
                          >
                            <Activity className="w-3 h-3 animate-pulse" />
                            <span>Full Diagnostics Suite</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleTestGateways}
                            disabled={testingGateways}
                            className="px-2.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {testingGateways ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            <span>Quick Ping</span>
                          </button>
                        </div>
                      </div>

                      {gatewayReport ? (
                        <div className="space-y-2 text-xs">
                          {/* ClubKonnect Report */}
                          <div className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                            gatewayReport.clubkonnect.status === "success"
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                              : gatewayReport.clubkonnect.status === "warning"
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200"
                              : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                          }`}>
                            {gatewayReport.clubkonnect.status === "success" ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            )}
                            <div className="text-[11px] leading-tight">
                              <p className="font-bold">ClubKonnect VTU Gateway</p>
                              <p className="mt-0.5 opacity-90">{gatewayReport.clubkonnect.message}</p>
                              {gatewayReport.clubkonnect.balance && (
                                <p className="mt-1 font-mono font-bold">Wallet: {gatewayReport.clubkonnect.balance}</p>
                              )}
                            </div>
                          </div>

                          {/* Paystack Report */}
                          <div className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                            gatewayReport.paystack.status === "success"
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                              : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                          }`}>
                            {gatewayReport.paystack.status === "success" ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            )}
                            <div className="text-[11px] leading-tight">
                              <p className="font-bold">Paystack Payment Gateway</p>
                              <p className="mt-0.5 opacity-90">{gatewayReport.paystack.message}</p>
                              {gatewayReport.paystack.balance && (
                                <p className="mt-1 font-mono font-bold text-emerald-400">Merchant Balance: {gatewayReport.paystack.balance}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400">
                          Click "Test Gateways" to verify live handshake with NelloByte ClubKonnect servers and the Paystack API.
                        </p>
                      )}
                    </div>

                    {configSaveNotice && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{configSaveNotice}</span>
                      </div>
                    )}

                    {/* SAVE CONFIG BUTTON */}
                    <button
                      onClick={handleSaveConfig}
                      disabled={savingConfig}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{savingConfig ? "Saving..." : "Save System Config"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: CHANNELS SWITCHBOARD & BROADCAST (5 COLS) */}
              <div className="lg:col-span-5 space-y-6">
                {/* HIGH-FIDELITY SERVICE CHANNELS HEALTH SWITCHBOARD */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-50 dark:border-gray-850 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <h2 className="text-sm font-black text-slate-900 dark:text-white font-sans">
                        VTU Services & Channels Switchboard
                      </h2>
                    </div>
                  </div>

                  <div className="p-4 space-y-3.5">
                    <p className="text-[10px] text-slate-400 leading-tight font-medium">
                      Toggle services and provider gateways online or offline. Services toggled online appear immediately on user dashboard. Offline channels show a graceful interruption notice.
                    </p>

                    <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                      {/* Core Services Section Header */}
                      <p className="text-[9px] uppercase font-black tracking-widest text-purple-500 pt-1">
                        Core Service Categories
                      </p>
                      {Object.entries({
                        airtime: "Airtime Recharge",
                        data: "Data Bundles",
                        cables: "Cable TV Subscriptions",
                        electricity: "Electricity Bills",
                        exams: "Edu Pins (WAEC/JAMB)",
                        betting: "Sports Betting Funding"
                      }).map(([sId, sName]) => {
                        const status = config.providerStatuses[sId] || "online";
                        const isOnline = status === "online";
                        return (
                          <div
                            key={sId}
                            className="flex items-center justify-between bg-purple-50/50 dark:bg-purple-950/20 px-3 py-2 rounded-xl border border-purple-100 dark:border-purple-900/40"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}
                              ></span>
                              <span className="text-xs font-black text-purple-900 dark:text-purple-200">{sName}</span>
                            </div>
                            <button
                              onClick={() => toggleProviderStatus(sId)}
                              className={`text-xs font-black px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                isOnline
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                  : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                              }`}
                            >
                              {isOnline ? "ACTIVE" : "DISABLED"}
                            </button>
                          </div>
                        );
                      })}

                      {/* Providers Section Header */}
                      <p className="text-[9px] uppercase font-black tracking-widest text-slate-400 pt-2">
                        Provider Networks & Gateways
                      </p>
                      {Object.entries({
                        mtn: "MTN Telecom",
                        airtel: "Airtel Nigeria",
                        glo: "Globacom Network",
                        "9mobile": "9mobile Link",
                        dstv: "DSTV MultiChoice",
                        gotv: "GOTV Stream",
                        startimes: "StarTimes Decoders",
                        ikedc: "Ikeja Electricity",
                        ekedc: "Eko Electricity",
                        waec: "WAEC Scratch Pin",
                        jamb: "JAMB Official Pin",
                        bet9ja: "Bet9ja Sports Wallet",
                        sportybet: "SportyBet Top-up"
                      }).map(([pId, pName]) => {
                        const status = config.providerStatuses[pId] || "online";
                        const isOnline = status === "online";
                        return (
                          <div
                            key={pId}
                            className="flex items-center justify-between bg-slate-50 dark:bg-gray-950/50 px-3 py-2 rounded-xl border border-slate-100 dark:border-gray-850"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}
                              ></span>
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{pName}</span>
                            </div>
                            <button
                              onClick={() => toggleProviderStatus(pId)}
                              className={`text-xs font-black px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                isOnline
                                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                                  : "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400"
                              }`}
                            >
                              {isOnline ? "ONLINE" : "OFFLINE"}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      onClick={handleSaveConfig}
                      disabled={savingConfig}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-slate-800 dark:text-white text-xs font-bold rounded-xl transition-all"
                    >
                      Apply Channels Switchboard
                    </button>
                  </div>
                </div>

                {/* GLOBAL SYSTEM-WIDE PUSH BROADCAST */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-50 dark:border-gray-850 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <h2 className="text-sm font-black text-slate-900 dark:text-white font-sans">
                        Global System Broadcast
                      </h2>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <p className="text-[10px] text-slate-400 leading-tight font-medium">
                      Transmits a network-wide alert card directly to every user's personal push tray in real-time.
                    </p>

                    <div className="space-y-2.5">
                      <input
                        type="text"
                        value={broadcastTitle}
                        onChange={(e) => setBroadcastTitle(e.target.value)}
                        placeholder="Broadcast Title (e.g., System Update)"
                        className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:ring-purple-600 focus:outline-none focus:ring-1"
                      />
                      <textarea
                        value={broadcastBody}
                        onChange={(e) => setBroadcastBody(e.target.value)}
                        placeholder="Type alert body text..."
                        rows={3}
                        className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:ring-purple-600 focus:outline-none focus:ring-1"
                      />
                      <button
                        onClick={handleBroadcastNotification}
                        disabled={broadcasting}
                        className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer shadow-purple-500/20"
                      >
                        {broadcasting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Broadcasting...
                          </>
                        ) : (
                          <>
                            <Bell className="w-4 h-4" /> Send Global Broadcast
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* TAB 5: SUPER ADMIN ACCESS */}
        {activeAdminTab === "super" && isSuperAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {/* 1. MANAGE LOCAL ADMINS CARD */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm overflow-hidden p-4 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-50 dark:border-gray-850 pb-3">
                    <UserCheck className="w-5 h-5 text-amber-500" />
                    <h2 className="text-sm font-black text-slate-900 dark:text-white font-sans">
                      Manage Local Admins
                    </h2>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-tight">
                    Authorise specific emails to access the Admin panel. Local admins can modify user balances, adjust system settings, and dispatch alerts.
                  </p>

                  <div className="space-y-3.5">
                    {/* Add local admin input */}
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="Enter email to authorize"
                        className="flex-1 bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:ring-purple-600 focus:outline-none focus:ring-1"
                      />
                      <button
                        onClick={handleAddLocalAdmin}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3.5 py-2 text-xs font-black uppercase rounded-xl transition-all shadow-sm shrink-0"
                      >
                        Add
                      </button>
                    </div>

                    {/* Authorized list */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Authorized Local Admins
                      </h4>
                      {(!config.localAdmins || config.localAdmins.length === 0) ? (
                        <p className="text-[10px] text-slate-400 italic">No local admins authorized yet.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                          {config.localAdmins.map((admEmail) => (
                            <div
                              key={admEmail}
                              className="flex items-center justify-between bg-slate-50 dark:bg-gray-950/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-gray-850"
                            >
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate mr-2">
                                {admEmail}
                              </span>
                              <button
                                onClick={() => handleRemoveLocalAdmin(admEmail)}
                                className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase shrink-0"
                              >
                                Revoke
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. DIRECT ACCOUNT CREATOR CARD */}
                <form onSubmit={handleAdminCreateAccount} className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm overflow-hidden p-4 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-50 dark:border-gray-850 pb-3">
                    <Users className="w-5 h-5 text-amber-500" />
                    <h2 className="text-sm font-black text-slate-900 dark:text-white font-sans">
                      Create Account Direct
                    </h2>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-tight">
                    Create and seed an account immediately in the Firestore database. The user will be able to log in instantly.
                  </p>

                  {creationErrorMsg && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl">
                      {creationErrorMsg}
                    </div>
                  )}

                  {creationSuccessMsg && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl">
                      {creationSuccessMsg}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={adminCreateEmail}
                        onChange={(e) => setAdminCreateEmail(e.target.value)}
                        placeholder="user@example.com"
                        className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-1.5 text-xs focus:ring-purple-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                        Full Legal Name
                      </label>
                      <input
                        type="text"
                        required
                        value={adminCreateFullName}
                        onChange={(e) => setAdminCreateFullName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-1.5 text-xs focus:ring-purple-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                        Username (Optional)
                      </label>
                      <input
                        type="text"
                        value={adminCreateUsername}
                        onChange={(e) => setAdminCreateUsername(e.target.value)}
                        placeholder="johndoe"
                        className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-1.5 text-xs focus:ring-purple-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={adminCreatePhone}
                        onChange={(e) => setAdminCreatePhone(e.target.value)}
                        placeholder="08031234567"
                        className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-1.5 text-xs focus:ring-purple-600 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                          Initial Balance (₦)
                        </label>
                        <input
                          type="number"
                          value={adminCreateBalance}
                          onChange={(e) => setAdminCreateBalance(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-1.5 text-xs focus:ring-purple-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                          Password
                        </label>
                        <input
                          type="password"
                          required
                          value={adminCreatePassword}
                          onChange={(e) => setAdminCreatePassword(e.target.value)}
                          placeholder="Min 6 chars"
                          className="w-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-1.5 text-xs focus:ring-purple-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full mt-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md animate-in fade-in"
                    >
                      Create Account
                    </button>
                  </div>
                </form>
              </div>
          )}
      </main>

      {/* Full Handshake Diagnostics Modal */}
      {showDiagnosticsDashboard && (
        <ApiDiagnosticsDashboard
          isOpen={showDiagnosticsDashboard}
          onClose={() => setShowDiagnosticsDashboard(false)}
          isModal={true}
        />
      )}
    </div>
  );
}
