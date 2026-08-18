/**
 * IndexedDB storage engine for Web Guest Mode in Pocketly.
 * Handles accounts, categories, transactions, budgets, goals, and money_rules.
 */

import type {
  LocalAccount,
  LocalBudget,
  LocalCategory,
  LocalGoal,
  LocalMoneyRule,
  LocalTransaction,
} from "./local-storage-adapter";

const DB_NAME = "pocketly_web_db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openIndexedDB(): Promise<IDBDatabase> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB is only available in browser"));
  }

  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains("accounts")) {
          db.createObjectStore("accounts", { keyPath: "_id" });
        }
        if (!db.objectStoreNames.contains("categories")) {
          db.createObjectStore("categories", { keyPath: "_id" });
        }
        if (!db.objectStoreNames.contains("transactions")) {
          const txStore = db.createObjectStore("transactions", { keyPath: "_id" });
          txStore.createIndex("date", "date", { unique: false });
          txStore.createIndex("accountId", "accountId", { unique: false });
          txStore.createIndex("categoryId", "categoryId", { unique: false });
        }
        if (!db.objectStoreNames.contains("budgets")) {
          db.createObjectStore("budgets", { keyPath: "_id" });
        }
        if (!db.objectStoreNames.contains("goals")) {
          db.createObjectStore("goals", { keyPath: "_id" });
        }
        if (!db.objectStoreNames.contains("money_rules")) {
          db.createObjectStore("money_rules", { keyPath: "_id" });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  return dbPromise;
}

// ---------------- Generic Store Helpers ----------------

async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  try {
    const db = await openIndexedDB();
    return new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

async function putToStore<T>(storeName: string, value: T): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.put(value);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore
  }
}

async function deleteFromStore(storeName: string, id: string): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore
  }
}

// ---------------- Accounts ----------------
export async function idbGetAccounts(): Promise<LocalAccount[]> {
  return getAllFromStore<LocalAccount>("accounts");
}

export async function idbSaveAccount(account: LocalAccount): Promise<void> {
  return putToStore("accounts", account);
}

export async function idbDeleteAccount(id: string): Promise<void> {
  return deleteFromStore("accounts", id);
}

// ---------------- Categories ----------------
export async function idbGetCategories(): Promise<LocalCategory[]> {
  return getAllFromStore<LocalCategory>("categories");
}

export async function idbSaveCategory(category: LocalCategory): Promise<void> {
  return putToStore("categories", category);
}

export async function idbDeleteCategory(id: string): Promise<void> {
  return deleteFromStore("categories", id);
}

// ---------------- Transactions ----------------
export async function idbGetTransactions(): Promise<LocalTransaction[]> {
  const list = await getAllFromStore<LocalTransaction>("transactions");
  return list.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export async function idbSaveTransaction(tx: LocalTransaction): Promise<void> {
  return putToStore("transactions", tx);
}

export async function idbDeleteTransaction(id: string): Promise<void> {
  return deleteFromStore("transactions", id);
}

// ---------------- Budgets ----------------
export async function idbGetBudgets(): Promise<LocalBudget[]> {
  return getAllFromStore<LocalBudget>("budgets");
}

export async function idbSaveBudget(budget: LocalBudget): Promise<void> {
  return putToStore("budgets", budget);
}

export async function idbDeleteBudget(id: string): Promise<void> {
  return deleteFromStore("budgets", id);
}

// ---------------- Goals ----------------
export async function idbGetGoals(): Promise<LocalGoal[]> {
  return getAllFromStore<LocalGoal>("goals");
}

export async function idbSaveGoal(goal: LocalGoal): Promise<void> {
  return putToStore("goals", goal);
}

export async function idbDeleteGoal(id: string): Promise<void> {
  return deleteFromStore("goals", id);
}

// ---------------- Money Rules ----------------
export async function idbGetMoneyRules(): Promise<LocalMoneyRule[]> {
  return getAllFromStore<LocalMoneyRule>("money_rules");
}

export async function idbSaveMoneyRule(rule: LocalMoneyRule): Promise<void> {
  return putToStore("money_rules", rule);
}

export async function idbDeleteMoneyRule(id: string): Promise<void> {
  return deleteFromStore("money_rules", id);
}

// ---------------- Clear All ----------------
export async function idbClearAll(): Promise<void> {
  try {
    const db = await openIndexedDB();
    const storeNames = ["accounts", "categories", "transactions", "budgets", "goals", "money_rules"];
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeNames, "readwrite");
      storeNames.forEach((name) => tx.objectStore(name).clear());
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}
