import { NormalizedLandmark } from "@/types";

const DB_NAME = "SL_LATOR_DB";
const DB_VERSION = 1;
const STORE_DATASETS = "datasets";
const STORE_FEEDBACK = "feedback";

export interface FeedbackRecord {
  id?: number;
  timestamp: string;
  label: string;
  landmarks: NormalizedLandmark[];
}

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not supported"));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_DATASETS)) {
        db.createObjectStore(STORE_DATASETS, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORE_FEEDBACK)) {
        db.createObjectStore(STORE_FEEDBACK, { keyPath: "id", autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveFeedback(record: Omit<FeedbackRecord, "id">): Promise<number> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FEEDBACK, "readwrite");
    const store = tx.objectStore(STORE_FEEDBACK);
    const req = store.add(record);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function getFeedbackCount(): Promise<number> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FEEDBACK, "readonly");
    const store = tx.objectStore(STORE_FEEDBACK);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllFeedback(): Promise<FeedbackRecord[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FEEDBACK, "readonly");
    const store = tx.objectStore(STORE_FEEDBACK);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as FeedbackRecord[]);
    req.onerror = () => reject(req.error);
  });
}

export async function cachePrecollectedDataset(key: string, data: any): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DATASETS, "readwrite");
    const store = tx.objectStore(STORE_DATASETS);
    const req = store.put({ key, data });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedDataset(key: string): Promise<any | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DATASETS, "readonly");
    const store = tx.objectStore(STORE_DATASETS);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ? req.result.data : null);
    req.onerror = () => reject(req.error);
  });
}
