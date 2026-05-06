import { selectIdsToEvict } from "./recent-scans-fifo";

export const DB_NAME = "VdcVaultDB";
export const STORE_NAME = "healthchecks";
export const DB_VERSION = 1;
export const MAX_SCANS = 5;

export interface StoredScan {
  id: number;
  filename: string;
  uploadedAt: string;
  jobCount: number;
  sourceTb: number | null;
  vbrVersion: string | null;
  rawJson: string;
}

export type StoredScanSummary = Omit<StoredScan, "rawJson">;

let dbPromise: Promise<IDBDatabase> | null = null;
let unavailableWarned = false;

function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function warnUnavailableOnce(): void {
  if (!unavailableWarned) {
    console.warn(
      "IndexedDB is not available; recent scans will not be persisted.",
    );
    unavailableWarned = true;
  }
}

export function __resetForTests(): void {
  dbPromise = null;
  unavailableWarned = false;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("IndexedDB upgrade blocked"));
  });
}

export function initDB(): Promise<IDBDatabase> {
  if (!isIndexedDbAvailable()) {
    warnUnavailableOnce();
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (!dbPromise) {
    dbPromise = openDb();
  }
  return dbPromise;
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txComplete(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted"));
  });
}

export async function saveScan(scan: Omit<StoredScan, "id">): Promise<number> {
  if (!isIndexedDbAvailable()) {
    warnUnavailableOnce();
    return -1;
  }
  const db = await initDB();

  // Find a unique id derived from Date.now(). Done in a separate read txn so we
  // can `await` between getKey() probes without auto-committing the write txn.
  const readTx = db.transaction(STORE_NAME, "readonly");
  const readStore = readTx.objectStore(STORE_NAME);
  let id = Date.now();
  while ((await promisifyRequest(readStore.getKey(id))) !== undefined) {
    id += 1;
  }
  await txComplete(readTx);

  const record: StoredScan = { ...scan, id };

  const writeTx = db.transaction(STORE_NAME, "readwrite");
  const writeStore = writeTx.objectStore(STORE_NAME);

  // Chain requests via onsuccess so the txn doesn't auto-commit between them.
  // After add() resolves, getAllKeys() to compute eviction list, then delete()
  // each candidate. All within the same txn microtask.
  await new Promise<void>((resolve, reject) => {
    const addReq = writeStore.add(record);
    addReq.onerror = () => reject(addReq.error);
    addReq.onsuccess = () => {
      const keysReq = writeStore.getAllKeys();
      keysReq.onerror = () => reject(keysReq.error);
      keysReq.onsuccess = () => {
        const ids = (keysReq.result as IDBValidKey[]).map((k) => Number(k));
        const toEvict = selectIdsToEvict(ids, MAX_SCANS);
        if (toEvict.length === 0) {
          resolve();
          return;
        }
        let remaining = toEvict.length;
        for (const evictId of toEvict) {
          const delReq = writeStore.delete(evictId);
          delReq.onerror = () => reject(delReq.error);
          delReq.onsuccess = () => {
            remaining -= 1;
            if (remaining === 0) resolve();
          };
        }
      };
    };
  });

  try {
    await txComplete(writeTx);
  } catch (err) {
    if (err instanceof DOMException && err.name === "QuotaExceededError") {
      console.warn("IndexedDB quota exceeded; scan not saved.", err);
      return -1;
    }
    throw err;
  }
  return id;
}

export async function getRecentScans(): Promise<StoredScanSummary[]> {
  if (!isIndexedDbAvailable()) {
    warnUnavailableOnce();
    return [];
  }
  let db: IDBDatabase;
  try {
    db = await initDB();
  } catch (err) {
    console.warn("Failed to open IndexedDB:", err);
    return [];
  }

  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const all = await promisifyRequest(store.getAll());
  await txComplete(tx);

  const summaries: StoredScanSummary[] = (all as StoredScan[]).map((scan) => ({
    id: scan.id,
    filename: scan.filename,
    uploadedAt: scan.uploadedAt,
    jobCount: scan.jobCount,
    sourceTb: scan.sourceTb,
    vbrVersion: scan.vbrVersion,
  }));
  // newest-first by id (Date.now()-derived → monotonically increasing)
  summaries.sort((a, b) => b.id - a.id);
  return summaries;
}

export async function loadScanPayload(id: number): Promise<StoredScan | null> {
  if (!isIndexedDbAvailable()) {
    warnUnavailableOnce();
    return null;
  }
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const result = await promisifyRequest<StoredScan | undefined>(store.get(id));
  await txComplete(tx);
  return result ?? null;
}

export async function deleteScan(id: number): Promise<void> {
  if (!isIndexedDbAvailable()) {
    warnUnavailableOnce();
    return;
  }
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await promisifyRequest(store.delete(id));
  await txComplete(tx);
}
