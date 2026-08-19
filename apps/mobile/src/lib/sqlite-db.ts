import { Platform } from "react-native";
import * as SQLite from "expo-sqlite";
import type {
  LocalAccount,
  LocalBudget,
  LocalCategory,
  LocalGoal,
  LocalMoneyRule,
  LocalTransaction,
} from "./local-storage-adapter";

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getSQLiteDb(): Promise<SQLite.SQLiteDatabase | null> {
  if (Platform.OS === "web") {
    return null; // Web fallback
  }

  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync("pocketly.db");
    await initTables(dbInstance);
  }
  return dbInstance;
}

async function initTables(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      balance INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      icon TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      color TEXT,
      icon TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      date TEXT NOT NULL,
      category_id TEXT,
      account_id TEXT NOT NULL,
      to_account_id TEXT,
      description TEXT,
      note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      period TEXT NOT NULL DEFAULT 'monthly',
      spent INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      target_amount INTEGER NOT NULL,
      saved_amount INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'in_progress',
      target_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS money_rules (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      amount INTEGER,
      category_id TEXT,
      account_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_tx_account ON transactions(account_id);
    CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category_id);
  `);
}

// ---------------- SQLite Accounts CRUD ----------------
export async function sqliteGetAccounts(): Promise<LocalAccount[]> {
  const db = await getSQLiteDb();
  if (!db) return [];
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    type: string;
    balance: number;
    currency: string;
    icon: string | null;
    created_at: string;
    updated_at: string;
  }>("SELECT * FROM accounts ORDER BY name ASC;");

  return rows.map((r) => ({
    _id: r.id,
    name: r.name,
    type: r.type,
    balance: r.balance,
    currency: r.currency,
    icon: r.icon || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function sqliteSaveAccount(account: LocalAccount): Promise<void> {
  const db = await getSQLiteDb();
  if (!db) return;
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO accounts (id, name, type, balance, currency, icon, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      account._id,
      account.name,
      account.type,
      account.balance,
      account.currency,
      account.icon || null,
      account.createdAt || now,
      account.updatedAt || now,
    ],
  );
}

export async function sqliteDeleteAccount(id: string): Promise<void> {
  const db = await getSQLiteDb();
  if (!db) return;
  await db.runAsync("DELETE FROM accounts WHERE id = ?;", [id]);
}

// ---------------- SQLite Categories CRUD ----------------
export async function sqliteGetCategories(): Promise<LocalCategory[]> {
  const db = await getSQLiteDb();
  if (!db) return [];
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    type: "income" | "expense";
    color: string | null;
    icon: string | null;
    created_at: string;
    updated_at: string;
  }>("SELECT * FROM categories ORDER BY name ASC;");

  return rows.map((r) => ({
    _id: r.id,
    name: r.name,
    type: r.type,
    color: r.color || undefined,
    icon: r.icon || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function sqliteSaveCategory(category: LocalCategory): Promise<void> {
  const db = await getSQLiteDb();
  if (!db) return;
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO categories (id, name, type, color, icon, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [
      category._id,
      category.name,
      category.type,
      category.color || null,
      category.icon || null,
      category.createdAt || now,
      category.updatedAt || now,
    ],
  );
}

export async function sqliteDeleteCategory(id: string): Promise<void> {
  const db = await getSQLiteDb();
  if (!db) return;
  await db.runAsync("DELETE FROM categories WHERE id = ?;", [id]);
}

// ---------------- SQLite Transactions CRUD ----------------
export async function sqliteGetTransactions(): Promise<LocalTransaction[]> {
  const db = await getSQLiteDb();
  if (!db) return [];
  const rows = await db.getAllAsync<{
    id: string;
    type: "income" | "expense" | "transfer";
    amount: number;
    date: string;
    category_id: string | null;
    account_id: string;
    to_account_id: string | null;
    description: string | null;
    note: string | null;
    created_at: string;
    updated_at: string;
  }>("SELECT * FROM transactions ORDER BY date DESC, created_at DESC;");

  return rows.map((r) => ({
    _id: r.id,
    type: r.type,
    amount: r.amount,
    date: r.date,
    categoryId: r.category_id || undefined,
    accountId: r.account_id,
    toAccountId: r.to_account_id || undefined,
    description: r.description || undefined,
    note: r.note || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function sqliteSaveTransaction(tx: LocalTransaction): Promise<void> {
  const db = await getSQLiteDb();
  if (!db) return;
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO transactions (id, type, amount, date, category_id, account_id, to_account_id, description, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      tx._id,
      tx.type,
      tx.amount,
      tx.date,
      tx.categoryId || null,
      tx.accountId,
      tx.toAccountId || null,
      tx.description || null,
      tx.note || null,
      tx.createdAt || now,
      tx.updatedAt || now,
    ],
  );
}

export async function sqliteDeleteTransaction(id: string): Promise<void> {
  const db = await getSQLiteDb();
  if (!db) return;
  await db.runAsync("DELETE FROM transactions WHERE id = ?;", [id]);
}

// ---------------- SQLite Budgets CRUD ----------------
export async function sqliteGetBudgets(): Promise<LocalBudget[]> {
  const db = await getSQLiteDb();
  if (!db) return [];
  const rows = await db.getAllAsync<{
    id: string;
    category_id: string;
    amount: number;
    period: "monthly" | "weekly" | "yearly";
    spent: number;
    created_at: string;
    updated_at: string;
  }>("SELECT * FROM budgets;");

  return rows.map((r) => ({
    _id: r.id,
    categoryId: r.category_id,
    amount: r.amount,
    period: r.period,
    spent: r.spent,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function sqliteSaveBudget(budget: LocalBudget): Promise<void> {
  const db = await getSQLiteDb();
  if (!db) return;
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO budgets (id, category_id, amount, period, spent, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [
      budget._id,
      budget.categoryId,
      budget.amount,
      budget.period,
      budget.spent || 0,
      budget.createdAt || now,
      budget.updatedAt || now,
    ],
  );
}

export async function sqliteDeleteBudget(id: string): Promise<void> {
  const db = await getSQLiteDb();
  if (!db) return;
  await db.runAsync("DELETE FROM budgets WHERE id = ?;", [id]);
}

// ---------------- SQLite Goals CRUD ----------------
export async function sqliteGetGoals(): Promise<LocalGoal[]> {
  const db = await getSQLiteDb();
  if (!db) return [];
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    target_amount: number;
    saved_amount: number;
    status: "in_progress" | "reached" | "stalled";
    target_date: string | null;
    created_at: string;
    updated_at: string;
  }>("SELECT * FROM goals;");

  return rows.map((r) => ({
    _id: r.id,
    name: r.name,
    targetAmount: r.target_amount,
    savedAmount: r.saved_amount,
    status: r.status,
    targetDate: r.target_date || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function sqliteSaveGoal(goal: LocalGoal): Promise<void> {
  const db = await getSQLiteDb();
  if (!db) return;
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO goals (id, name, target_amount, saved_amount, status, target_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      goal._id,
      goal.name,
      goal.targetAmount,
      goal.savedAmount,
      goal.status,
      goal.targetDate || null,
      goal.createdAt || now,
      goal.updatedAt || now,
    ],
  );
}

export async function sqliteDeleteGoal(id: string): Promise<void> {
  const db = await getSQLiteDb();
  if (!db) return;
  await db.runAsync("DELETE FROM goals WHERE id = ?;", [id]);
}

// ---------------- SQLite Money Rules CRUD ----------------
export async function sqliteGetMoneyRules(): Promise<LocalMoneyRule[]> {
  const db = await getSQLiteDb();
  if (!db) return [];
  const rows = await db.getAllAsync<{
    id: string;
    type: string;
    enabled: number;
    amount: number | null;
    category_id: string | null;
    account_id: string | null;
    created_at: string;
    updated_at: string;
  }>("SELECT * FROM money_rules;");

  return rows.map((r) => ({
    _id: r.id,
    type: r.type,
    enabled: Boolean(r.enabled),
    amount: r.amount || undefined,
    categoryId: r.category_id || undefined,
    accountId: r.account_id || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function sqliteSaveMoneyRule(rule: LocalMoneyRule): Promise<void> {
  const db = await getSQLiteDb();
  if (!db) return;
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO money_rules (id, type, enabled, amount, category_id, account_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      rule._id,
      rule.type,
      rule.enabled ? 1 : 0,
      rule.amount ?? null,
      rule.categoryId || null,
      rule.accountId || null,
      rule.createdAt || now,
      rule.updatedAt || now,
    ],
  );
}

export async function sqliteDeleteMoneyRule(id: string): Promise<void> {
  const db = await getSQLiteDb();
  if (!db) return;
  await db.runAsync("DELETE FROM money_rules WHERE id = ?;", [id]);
}

// ---------------- SQLite Clear All ----------------
export async function sqliteClearAll(): Promise<void> {
  const db = await getSQLiteDb();
  if (!db) return;
  await db.execAsync(`
    DELETE FROM transactions;
    DELETE FROM accounts;
    DELETE FROM categories;
    DELETE FROM budgets;
    DELETE FROM goals;
    DELETE FROM money_rules;
  `);
}
