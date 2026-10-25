import { initializeApp } from "firebase/app";
import { 
  initializeFirestore,
  doc, 
  getDoc, 
  getDocFromServer,
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from "firebase/firestore";
import { 
  getAuth, 
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  signInWithPopup 
} from "firebase/auth";

// Config from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyCJVfvwDTsyoQzv6V0C-Kj29OjEqUChxZc",
  authDomain: "concentrated-reach-ttgzl.firebaseapp.com",
  projectId: "concentrated-reach-ttgzl",
  storageBucket: "concentrated-reach-ttgzl.firebasestorage.app",
  messagingSenderId: "181261838258",
  appId: "1:181261838258:web:89ff5baf8731f441c8a6ab"
};

const app = initializeApp(firebaseConfig);

// Use experimentalForceLongPolling to prevent WebChannel stream timeouts in sandboxed browser environments
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true
  },
  "ai-studio-7f4351bd-a9a6-4a2d-adeb-8fa10b3ab440"
);

export const auth = getAuth(app);

// Social Auth Providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export const facebookProvider = new FacebookAuthProvider();
facebookProvider.setCustomParameters({ display: "popup" });

/**
 * Robust sign-in / account creation with Google or Facebook.
 * Automatically synchronizes user data with Firestore.
 */
export async function signInWithSocialProvider(providerType: "google" | "facebook") {
  const provider = providerType === "google" ? googleProvider : facebookProvider;
  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  
  const email = (user.email || `${user.uid}@${providerType}.payclick.com`).toLowerCase().trim();
  const fullName = user.displayName || email.split("@")[0];
  const photoURL = user.photoURL || "";
  const username = (user.displayName || email.split("@")[0]).replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || email.split("@")[0];

  // Check or register profile in Firestore
  const docRef = doc(db, "users", email);
  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      // First-time social signup: initialize profile
      await setDoc(docRef, {
        email,
        full_name: fullName,
        username,
        auth_provider: providerType,
        avatar_url: photoURL,
        wallet_balance: 0,
        reward_points: 0,
        referred_friends: [],
        transactions: [],
        created_at: new Date().toISOString(),
        lastSynced: new Date().toISOString()
      }, { merge: true });
    } else {
      // Existing profile: update last login & provider info
      await setDoc(docRef, {
        last_login: new Date().toISOString(),
        lastSynced: new Date().toISOString()
      }, { merge: true });
    }
  } catch (err) {
    console.warn("Could not write social profile to Firestore directly:", err);
  }

  // Persist locally
  localStorage.setItem("vtu_user_email", email);
  localStorage.setItem("vtu_user_full_name", fullName);
  localStorage.setItem("vtu_user_username", username);
  if (photoURL) {
    localStorage.setItem("vtu_user_photo", photoURL);
  }

  await syncUserDataFromCloud(email);
  // Post customer to Paystack
  syncCustomerToPaystack(email, fullName, "", username).catch(e => console.warn("Paystack social sync err:", e));
  return { email, fullName, username, photoURL, user };
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firestore running in offline mode. Please check Firebase configuration if persistent cloud sync is desired.");
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function isPermissionError(error: unknown): boolean {
  if (!error) return false;
  const e = error as any;
  const msg = typeof e.message === "string" ? e.message.toLowerCase() : "";
  const code = typeof e.code === "string" ? e.code.toLowerCase() : "";
  return (
    code.includes("permission-denied") ||
    code.includes("unauthenticated") ||
    msg.includes("missing or insufficient permissions") ||
    msg.includes("permission-denied")
  );
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const err = error as any;
  const errInfo: FirestoreErrorInfo = {
    error: err?.message || String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map((p: any) => ({
        providerId: p.providerId,
        email: p.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface UserCloudData {
  wallet_balance?: number;
  reward_points?: number;
  referred_friends?: any[];
  notifications_list?: any[];
  transactions?: any[];
  full_name?: string;
  phone?: string;
  username?: string;
  email?: string;
  password?: string;
  address?: string;
  state?: string;
  city?: string;
  transaction_pin?: string;
  avatar_color?: string;
  kyc_verified?: boolean;
  kyc_details?: {
    idType: string;
    idNumber: string;
    bvn?: string;
    nin?: string;
    verifiedAt: string;
  };
  created_at?: string;
  lastSynced?: string;
}

/**
 * Gets a safe Firestore document reference ID from the user's email
 */
function getDocId(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Find user document in Firestore cloud database by email, phone, or username
 */
export async function findUserInCloud(identifier: string): Promise<UserCloudData | null> {
  if (!identifier) return null;
  const clean = identifier.trim().toLowerCase();

  // 1. Direct document lookup by email
  const docId = getDocId(clean);
  try {
    const docRef = doc(db, "users", docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserCloudData;
    }
  } catch (e: any) {
    if (isPermissionError(e)) {
      handleFirestoreError(e, OperationType.GET, `users/${docId}`);
    }
    console.warn("Direct doc query currently unavailable (offline or network):", e?.message || e);
  }

  // 2. Query users collection by phone number or username or email
  try {
    const usersRef = collection(db, "users");

    // Search by email field
    const qEmail = query(usersRef, where("email", "==", clean));
    const snapEmail = await getDocs(qEmail);
    if (!snapEmail.empty) {
      return snapEmail.docs[0].data() as UserCloudData;
    }

    // Search by phone field
    const qPhone = query(usersRef, where("phone", "==", identifier.trim()));
    const snapPhone = await getDocs(qPhone);
    if (!snapPhone.empty) {
      return snapPhone.docs[0].data() as UserCloudData;
    }

    // Search by username field
    const qUser = query(usersRef, where("username", "==", clean));
    const snapUser = await getDocs(qUser);
    if (!snapUser.empty) {
      return snapUser.docs[0].data() as UserCloudData;
    }
  } catch (err: any) {
    if (isPermissionError(err)) {
      handleFirestoreError(err, OperationType.LIST, "users");
    }
    console.warn("Collection search currently unavailable (offline or network):", err?.message || err);
  }

  return null;
}

/**
 * Loads user data from Firestore or seeds it from localStorage if not present
 */
export async function syncUserDataFromCloud(email: string) {
  if (!email) return null;
  const docId = getDocId(email);
  const docRef = doc(db, "users", docId);

  try {
    let docSnap;
    try {
      docSnap = await getDoc(docRef);
    } catch (e: any) {
      if (isPermissionError(e)) {
        handleFirestoreError(e, OperationType.GET, `users/${docId}`);
      }
      console.warn("Could not fetch remote user doc (offline or slow network):", e?.message || e);
      return null;
    }

    if (docSnap && docSnap.exists()) {
      const data = docSnap.data() as UserCloudData;
      console.log("Loaded persistent cloud data for user:", email);

      // Restore to localStorage to keep local state up to date
      if (data.wallet_balance !== undefined) {
        localStorage.setItem("vtu_wallet_balance", data.wallet_balance.toFixed(2));
      }
      if (data.reward_points !== undefined) {
        localStorage.setItem("reward_points", data.reward_points.toString());
      }
      if (data.referred_friends !== undefined) {
        localStorage.setItem("vtu_referred_friends", JSON.stringify(data.referred_friends));
      }
      if (data.notifications_list !== undefined) {
        localStorage.setItem("vtu_notifications_list", JSON.stringify(data.notifications_list));
      }
      if (data.transactions !== undefined) {
        localStorage.setItem("vtu_transactions", JSON.stringify(data.transactions));
      }
      if (data.full_name !== undefined) {
        localStorage.setItem("vtu_user_full_name", data.full_name);
      }
      if (data.phone !== undefined) {
        localStorage.setItem("vtu_user_phone", data.phone);
      }
      if (data.username !== undefined) {
        localStorage.setItem("vtu_user_username", data.username);
      }
      if (data.address !== undefined) {
        localStorage.setItem("vtu_user_address", data.address);
      }
      if (data.state !== undefined) {
        localStorage.setItem("vtu_user_state", data.state);
      }
      if (data.city !== undefined) {
        localStorage.setItem("vtu_user_city", data.city);
      }
      if (data.transaction_pin !== undefined) {
        localStorage.setItem("vtu_user_tx_pin", data.transaction_pin);
      }
      if (data.avatar_color !== undefined) {
        localStorage.setItem("vtu_user_avatar_color", data.avatar_color);
      }
      if (data.kyc_verified !== undefined) {
        localStorage.setItem("vtu_kyc_verified", String(data.kyc_verified));
      }
      if (data.kyc_details !== undefined) {
        localStorage.setItem("vtu_kyc_details", JSON.stringify(data.kyc_details));
      }

      return data;
    } else {
      console.log("No cloud data found. Seeding Firestore with current localStorage data.");
      // Seed cloud database from local storage
      const localBal = localStorage.getItem("vtu_wallet_balance");
      const localPoints = localStorage.getItem("reward_points");
      const localFriends = localStorage.getItem("vtu_referred_friends");
      const localNotifs = localStorage.getItem("vtu_notifications_list");
      const localTxs = localStorage.getItem("vtu_transactions");
      const localFullName = localStorage.getItem("vtu_user_full_name");
      const localPhone = localStorage.getItem("vtu_user_phone");
      const localUsername = localStorage.getItem("vtu_user_username");
      const localAddress = localStorage.getItem("vtu_user_address");
      const localState = localStorage.getItem("vtu_user_state");
      const localCity = localStorage.getItem("vtu_user_city");
      const localTxPin = localStorage.getItem("vtu_user_tx_pin");
      const localAvatarColor = localStorage.getItem("vtu_user_avatar_color");
      const localKycVerified = localStorage.getItem("vtu_kyc_verified") === "true";
      const localKycDetails = localStorage.getItem("vtu_kyc_details");

      const seedData: UserCloudData = {
        email: email,
        wallet_balance: localBal ? parseFloat(localBal) : 0,
        reward_points: localPoints ? parseInt(localPoints, 10) : 0,
        referred_friends: localFriends ? JSON.parse(localFriends) : [],
        notifications_list: localNotifs ? JSON.parse(localNotifs) : [],
        transactions: localTxs ? JSON.parse(localTxs) : [],
        full_name: localFullName || "",
        phone: localPhone || "",
        username: localUsername || "",
        address: localAddress || "",
        state: localState || "",
        city: localCity || "",
        transaction_pin: localTxPin || "1234",
        avatar_color: localAvatarColor || "#9333ea",
        kyc_verified: localKycVerified,
        kyc_details: localKycDetails ? JSON.parse(localKycDetails) : null,
        lastSynced: new Date().toISOString()
      };

      try {
        await setDoc(docRef, seedData, { merge: true });
      } catch (e: any) {
        if (isPermissionError(e)) {
          handleFirestoreError(e, OperationType.CREATE, `users/${docId}`);
        }
        console.warn("Failed to seed initial user data to Firestore (offline):", e?.message || e);
      }
      return seedData;
    }
  } catch (error) {
    console.error("Error synchronizing with Firestore cloud database:", error);
    return null;
  }
}

/**
 * Saves a specific user field to Firestore and local storage simultaneously
 */
export async function saveUserFieldToCloud(email: string, fieldName: keyof UserCloudData, value: any) {
  if (!email) return;
  const docId = getDocId(email);
  const docRef = doc(db, "users", docId);

  try {
    // Atomic setDoc with merge: true handles both document creation and partial field update
    // without requiring an extra getDoc read, guaranteeing seamless offline persistence
    await setDoc(
      docRef,
      {
        [fieldName]: value,
        lastSynced: new Date().toISOString()
      },
      { merge: true }
    );
    console.log(`Cloud saved successfully: [${fieldName}] for ${email}`);
  } catch (e: any) {
    if (isPermissionError(e)) {
      handleFirestoreError(e, OperationType.WRITE, `users/${docId}`);
    }
    console.warn(`Failed to save [${fieldName}] to Firestore cloud (offline/network):`, e?.message || e);
  }
}

/**
 * Synchronizes customer details with Paystack Customer API
 */
export async function syncCustomerToPaystack(email: string, fullName?: string, phone?: string, username?: string) {
  if (!email) return null;
  try {
    const res = await fetch("/api/paystack/customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, fullName, phone, username })
    });
    const data = await res.json();
    if (data.status && data.customerCode) {
      localStorage.setItem("vtu_paystack_customer_code", data.customerCode);
      if (data.dedicatedAccount?.account_number) {
        localStorage.setItem("vtu_paystack_account_number", data.dedicatedAccount.account_number);
        localStorage.setItem("vtu_paystack_bank_name", data.dedicatedAccount.bank?.name || "Wema Bank / Titan");
      }
      // Save to cloud asynchronously
      saveUserFieldToCloud(email, "paystack_customer_code" as any, data.customerCode);
      if (data.dedicatedAccount) {
        saveUserFieldToCloud(email, "paystack_dedicated_account" as any, data.dedicatedAccount);
      }
    }
    return data;
  } catch (err) {
    console.warn("Could not sync customer to Paystack:", err);
    return null;
  }
}

/**
 * Fetches the user's customer and balance info from Paystack
 */
export async function fetchCustomerPaystackBalance(email: string) {
  if (!email) return null;
  try {
    const res = await fetch(`/api/paystack/customer/${encodeURIComponent(email)}/balance`);
    return await res.json();
  } catch (err) {
    console.warn("Could not fetch customer Paystack balance:", err);
    return null;
  }
}

/**
 * Synchronizes wallet balance with successful Paystack deposits
 */
export async function syncPaystackBalanceWithWallet(email: string) {
  if (!email) return null;
  try {
    const res = await fetch("/api/paystack/sync-balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn("Could not sync Paystack balance with wallet:", err);
    return null;
  }
}

/**
 * Fetches the merchant's live balance from Paystack
 */
export async function fetchPaystackMerchantBalance() {
  try {
    const res = await fetch("/api/paystack/balance");
    return await res.json();
  } catch (err) {
    console.warn("Could not fetch Paystack merchant balance:", err);
    return null;
  }
}

/**
 * Creates/Generates Dedicated Virtual Account on Paystack with KYC verification
 */
export async function generatePaystackDedicatedAccount(params: {
  email: string;
  fullName: string;
  phone?: string;
  bvn?: string;
  nin?: string;
  idType?: string;
  idNumber?: string;
}) {
  if (!params.email) return null;
  try {
    const res = await fetch("/api/paystack/dedicated-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (data.status && data.accountNumber) {
      localStorage.setItem("vtu_paystack_account_number", data.accountNumber);
      if (data.bankName) {
        localStorage.setItem("vtu_paystack_bank_name", data.bankName);
      }
      if (data.customerCode) {
        localStorage.setItem("vtu_paystack_customer_code", data.customerCode);
      }
      // Save to cloud
      saveUserFieldToCloud(params.email, "paystack_account_number" as any, data.accountNumber);
      saveUserFieldToCloud(params.email, "paystack_bank_name" as any, data.bankName);
      saveUserFieldToCloud(params.email, "paystack_customer_code" as any, data.customerCode);
      saveUserFieldToCloud(params.email, "kyc_verified" as any, true);
    }
    return data;
  } catch (err) {
    console.warn("Could not generate Paystack dedicated account:", err);
    return null;
  }
}

