import { db } from "./firebase";
import { collection, doc, setDoc, getDocs, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { AdminActivityLog } from "@/types/admin";

const LOCAL_STORAGE_KEY = "vtu_admin_activity_logs";

export async function logAdminActivity(entry: Omit<AdminActivityLog, "id" | "timestamp"> & { timestamp?: string }): Promise<AdminActivityLog> {
  const logId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = entry.timestamp || new Date().toISOString();

  const fullLog: AdminActivityLog = {
    ...entry,
    id: logId,
    timestamp
  };

  // 1. Immediately store in localStorage cache
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const existing: AdminActivityLog[] = raw ? JSON.parse(raw) : [];
    existing.unshift(fullLog);
    // keep max 200 logs locally
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing.slice(0, 200)));
    window.dispatchEvent(new CustomEvent("vtu-admin-activity-updated", { detail: fullLog }));
  } catch (err) {
    console.warn("Could not cache admin activity log locally:", err);
  }

  // 2. Persist to Firestore admin_activity_logs collection
  try {
    const logDocRef = doc(db, "admin_activity_logs", logId);
    await setDoc(logDocRef, fullLog);
  } catch (err) {
    console.warn("Could not write activity log to Firestore, stored in local audit trail:", err);
  }

  return fullLog;
}

export function getCachedAdminActivityLogs(): AdminActivityLog[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

export function subscribeToAdminActivityLogs(
  onUpdate: (logs: AdminActivityLog[]) => void
): () => void {
  // Return cached first
  const cached = getCachedAdminActivityLogs();
  if (cached.length > 0) {
    onUpdate(cached);
  }

  // Real-time Firestore snapshot listener
  try {
    const logsCol = collection(db, "admin_activity_logs");
    const q = query(logsCol, limit(100));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const remoteLogs: AdminActivityLog[] = [];
        snapshot.forEach((docSnap) => {
          remoteLogs.push(docSnap.data() as AdminActivityLog);
        });

        // Merge remote and local logs to guarantee zero loss
        const local = getCachedAdminActivityLogs();
        const map = new Map<string, AdminActivityLog>();

        local.forEach((l) => map.set(l.id, l));
        remoteLogs.forEach((l) => map.set(l.id, l));

        const sorted = Array.from(map.values()).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sorted.slice(0, 200)));
        onUpdate(sorted);
      },
      (err) => {
        console.warn("Firestore activity logs listener error, using local audit cache:", err);
        onUpdate(getCachedAdminActivityLogs());
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn("Failed to subscribe to Firestore activity logs:", err);
    return () => {};
  }
}
