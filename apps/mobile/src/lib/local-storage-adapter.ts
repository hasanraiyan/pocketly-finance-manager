import {
  sqliteClearAll,
  sqliteDeleteAccount,
  sqliteDeleteBudget,
  sqliteDeleteCategory,
  sqliteDeleteGoal,
  sqliteDeleteMoneyRule,
  sqliteDeleteTransaction,
  sqliteGetAccounts,
  sqliteGetBudgets,
  sqliteGetCategories,
  sqliteGetGoals,
  sqliteGetMoneyRules,
  sqliteGetTransactions,
  sqliteSaveAccount,
  sqliteSaveBudget,
  sqliteSaveCategory,
  sqliteSaveGoal,
  sqliteSaveMoneyRule,
  sqliteSaveTransaction,
} from "./sqlite-db";
import { safeStorage } from "./safe-storage";

export interface LocalCategory {
  _id: string;
  name: string;
  type: "expense" | "income";
  color?: string;
  icon?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LocalAccount {
  _id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  icon?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LocalTransaction {
  _id: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  date: string;
  categoryId: string;
  accountId: string;
  toAccountId?: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LocalBudget {
  _id: string;
  categoryId: string;
  amount: number;
  period: "monthly" | "weekly" | "yearly";
  spent?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LocalGoal {
  _id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  status: "in_progress" | "reached" | "stalled";
  targetDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LocalMoneyRule {
  _id: string;
  type: string;
  enabled: boolean;
  amount?: number;
  categoryId?: string;
  accountId?: string;
  lastFiredAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

const STORAGE_KEYS = {
  ACCOUNTS: "POCKETLY_LOCAL_ACCOUNTS",
  TRANSACTIONS: "POCKETLY_LOCAL_TRANSACTIONS",
  BUDGETS: "POCKETLY_LOCAL_BUDGETS",
  GOALS: "POCKETLY_LOCAL_GOALS",
  RULES: "POCKETLY_LOCAL_RULES",
  CATEGORIES: "POCKETLY_LOCAL_CATEGORIES",
  USER: "POCKETLY_LOCAL_USER",
};

const DEFAULT_CATEGORIES: LocalCategory[] = [
  { _id: "cat_food", name: "Food & Dining", type: "expense", color: "#f59e0b", icon: "coffee", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { _id: "cat_groceries", name: "Groceries", type: "expense", color: "#10b981", icon: "shopping-bag", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { _id: "cat_housing", name: "Housing & Rent", type: "expense", color: "#3b82f6", icon: "home", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { _id: "cat_transport", name: "Transport", type: "expense", color: "#8b5cf6", icon: "truck", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { _id: "cat_utilities", name: "Utilities", type: "expense", color: "#ec4899", icon: "zap", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { _id: "cat_entertainment", name: "Entertainment", type: "expense", color: "#06b6d4", icon: "film", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { _id: "cat_shopping", name: "Shopping", type: "expense", color: "#f43f5e", icon: "gift", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { _id: "cat_salary", name: "Salary", type: "income", color: "#10b981", icon: "briefcase", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { _id: "cat_freelance", name: "Freelance", type: "income", color: "#3b82f6", icon: "dollar-sign", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { _id: "cat_investments", name: "Investments", type: "income", color: "#8b5cf6", icon: "trending-up", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const DEFAULT_ACCOUNTS: LocalAccount[] = [
  { _id: "acc_cash", name: "Cash Wallet", type: "cash", balance: 0, currency: "USD", icon: "wallet", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { _id: "acc_checking", name: "Main Checking", type: "bank", balance: 0, currency: "USD", icon: "credit-card", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

export function generateLocalId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

// 1. Initial Seed Data
export async function ensureLocalSeedData() {
  const sqlCats = await sqliteGetCategories();
  if (sqlCats.length === 0) {
    for (const c of DEFAULT_CATEGORIES) {
      await sqliteSaveCategory(c);
    }
  }

  const sqlAccs = await sqliteGetAccounts();
  if (sqlAccs.length === 0) {
    for (const a of DEFAULT_ACCOUNTS) {
      await sqliteSaveAccount(a);
    }
  }
}

// ---------------- ACCOUNTS ----------------
export async function getLocalAccounts(): Promise<LocalAccount[]> {
  await ensureLocalSeedData();
  const sql = await sqliteGetAccounts();
  if (sql.length > 0) return sql;

  const raw = await safeStorage.getItem(STORAGE_KEYS.ACCOUNTS);
  return raw ? JSON.parse(raw) : DEFAULT_ACCOUNTS;
}

export async function saveLocalAccount(account: Omit<LocalAccount, "_id"> & { _id?: string }): Promise<LocalAccount> {
  const list = await getLocalAccounts();
  const id = account._id || generateLocalId("acc");
  const now = new Date().toISOString();
  const updated: LocalAccount = {
    _id: id,
    name: account.name,
    type: account.type,
    balance: account.balance,
    currency: account.currency || "USD",
    icon: account.icon,
    createdAt: now,
    updatedAt: now,
  };

  await sqliteSaveAccount(updated);
  const next = list.filter((a) => a._id !== id).concat(updated);
  await safeStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(next));
  return updated;
}

export async function deleteLocalAccount(id: string): Promise<void> {
  await sqliteDeleteAccount(id);
  const list = await getLocalAccounts();
  const next = list.filter((a) => a._id !== id);
  await safeStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(next));
}

// ---------------- CATEGORIES ----------------
export async function getLocalCategories(): Promise<LocalCategory[]> {
  await ensureLocalSeedData();
  const sql = await sqliteGetCategories();
  if (sql.length > 0) return sql;

  const raw = await safeStorage.getItem(STORAGE_KEYS.CATEGORIES);
  return raw ? JSON.parse(raw) : DEFAULT_CATEGORIES;
}

export async function saveLocalCategory(category: Omit<LocalCategory, "_id"> & { _id?: string }): Promise<LocalCategory> {
  const list = await getLocalCategories();
  const id = category._id || generateLocalId("cat");
  const now = new Date().toISOString();
  const updated: LocalCategory = {
    _id: id,
    name: category.name,
    type: category.type,
    color: category.color,
    icon: category.icon,
    createdAt: now,
    updatedAt: now,
  };

  await sqliteSaveCategory(updated);
  const next = list.filter((c) => c._id !== id).concat(updated);
  await safeStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(next));
  return updated;
}

export async function deleteLocalCategory(id: string): Promise<void> {
  await sqliteDeleteCategory(id);
  const list = await getLocalCategories();
  const next = list.filter((c) => c._id !== id);
  await safeStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(next));
}

// ---------------- TRANSACTIONS ----------------
export async function getLocalTransactions(): Promise<LocalTransaction[]> {
  const sql = await sqliteGetTransactions();
  if (sql.length > 0) return sql;

  const raw = await safeStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveLocalTransaction(tx: Omit<LocalTransaction, "_id"> & { _id?: string }): Promise<LocalTransaction> {
  const id = tx._id || generateLocalId("tx");
  const now = new Date().toISOString();
  const updated: LocalTransaction = {
    _id: id,
    type: tx.type,
    amount: tx.amount,
    date: tx.date || now,
    categoryId: tx.categoryId,
    accountId: tx.accountId,
    toAccountId: tx.toAccountId,
    note: tx.note,
    createdAt: now,
    updatedAt: now,
  };

  await sqliteSaveTransaction(updated);

  // Update account balance
  const accounts = await getLocalAccounts();
  const targetAcc = accounts.find((a) => a._id === tx.accountId);
  if (targetAcc) {
    if (tx.type === "income") {
      targetAcc.balance += tx.amount;
    } else if (tx.type === "expense") {
      targetAcc.balance -= tx.amount;
    } else if (tx.type === "transfer" && tx.toAccountId) {
      targetAcc.balance -= tx.amount;
      const destAcc = accounts.find((a) => a._id === tx.toAccountId);
      if (destAcc) destAcc.balance += tx.amount;
    }
    for (const a of accounts) {
      await sqliteSaveAccount(a);
    }
    await safeStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  }

  const txs = await getLocalTransactions();
  const nextTxs = [updated, ...txs.filter((t) => t._id !== id)];
  await safeStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(nextTxs));
  return updated;
}

export async function deleteLocalTransaction(id: string): Promise<void> {
  const txs = await getLocalTransactions();
  const target = txs.find((t) => t._id === id);
  if (target) {
    const accounts = await getLocalAccounts();
    const targetAcc = accounts.find((a) => a._id === target.accountId);
    if (targetAcc) {
      if (target.type === "income") targetAcc.balance -= target.amount;
      if (target.type === "expense") targetAcc.balance += target.amount;
      for (const a of accounts) {
        await sqliteSaveAccount(a);
      }
      await safeStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
    }
  }

  await sqliteDeleteTransaction(id);
  const nextTxs = txs.filter((t) => t._id !== id);
  await safeStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(nextTxs));
}

// ---------------- BUDGETS ----------------
export async function getLocalBudgets(): Promise<LocalBudget[]> {
  const sql = await sqliteGetBudgets();
  if (sql.length > 0) return sql;

  const raw = await safeStorage.getItem(STORAGE_KEYS.BUDGETS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveLocalBudget(budget: Omit<LocalBudget, "_id"> & { _id?: string }): Promise<LocalBudget> {
  const list = await getLocalBudgets();
  const id = budget._id || generateLocalId("bgt");
  const now = new Date().toISOString();
  const updated: LocalBudget = {
    _id: id,
    categoryId: budget.categoryId,
    amount: budget.amount,
    period: budget.period,
    spent: budget.spent || 0,
    createdAt: now,
    updatedAt: now,
  };

  await sqliteSaveBudget(updated);
  const next = list.filter((b) => b._id !== id).concat(updated);
  await safeStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(next));
  return updated;
}

export async function deleteLocalBudget(id: string): Promise<void> {
  await sqliteDeleteBudget(id);
  const list = await getLocalBudgets();
  const next = list.filter((b) => b._id !== id);
  await safeStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(next));
}

// ---------------- GOALS ----------------
export async function getLocalGoals(): Promise<LocalGoal[]> {
  const sql = await sqliteGetGoals();
  if (sql.length > 0) return sql;

  const raw = await safeStorage.getItem(STORAGE_KEYS.GOALS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveLocalGoal(goal: Omit<LocalGoal, "_id"> & { _id?: string }): Promise<LocalGoal> {
  const list = await getLocalGoals();
  const id = goal._id || generateLocalId("goal");
  const now = new Date().toISOString();
  const updated: LocalGoal = {
    _id: id,
    name: goal.name,
    targetAmount: goal.targetAmount,
    savedAmount: goal.savedAmount || 0,
    status: goal.status || "in_progress",
    targetDate: goal.targetDate,
    createdAt: now,
    updatedAt: now,
  };

  await sqliteSaveGoal(updated);
  const next = list.filter((g) => g._id !== id).concat(updated);
  await safeStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(next));
  return updated;
}

export async function contributeLocalGoal(id: string, amount: number): Promise<LocalGoal> {
  const goals = await getLocalGoals();
  const target = goals.find((g) => g._id === id);
  if (!target) throw new Error("Goal not found");
  target.savedAmount += amount;
  if (target.savedAmount >= target.targetAmount) {
    target.status = "reached";
  }
  await sqliteSaveGoal(target);
  await safeStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
  return target;
}

export async function deleteLocalGoal(id: string): Promise<void> {
  await sqliteDeleteGoal(id);
  const list = await getLocalGoals();
  const next = list.filter((g) => g._id !== id);
  await safeStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(next));
}

// ---------------- MONEY RULES ----------------
export async function getLocalMoneyRules(): Promise<LocalMoneyRule[]> {
  const sql = await sqliteGetMoneyRules();
  if (sql.length > 0) return sql;

  const raw = await safeStorage.getItem(STORAGE_KEYS.RULES);
  return raw ? JSON.parse(raw) : [];
}

export async function saveLocalMoneyRule(rule: Omit<LocalMoneyRule, "_id"> & { _id?: string }): Promise<LocalMoneyRule> {
  const list = await getLocalMoneyRules();
  const id = rule._id || generateLocalId("rule");
  const now = new Date().toISOString();
  const updated: LocalMoneyRule = {
    _id: id,
    type: rule.type,
    enabled: rule.enabled ?? true,
    amount: rule.amount,
    categoryId: rule.categoryId,
    accountId: rule.accountId,
    createdAt: now,
    updatedAt: now,
  };

  await sqliteSaveMoneyRule(updated);
  const next = list.filter((r) => r._id !== id).concat(updated);
  await safeStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(next));
  return updated;
}

export async function deleteLocalMoneyRule(id: string): Promise<void> {
  await sqliteDeleteMoneyRule(id);
  const list = await getLocalMoneyRules();
  const next = list.filter((r) => r._id !== id);
  await safeStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(next));
}

// ---------------- OVERVIEW & AGGREGATIONS ----------------
export async function getLocalOverview() {
  const txs = await getLocalTransactions();
  let income = 0;
  let expense = 0;

  txs.forEach((t) => {
    if (t.type === "income") income += t.amount;
    if (t.type === "expense") expense += t.amount;
  });

  return {
    income,
    expense,
    net: income - expense,
  };
}

export async function clearAllLocalGuestData(): Promise<void> {
  await sqliteClearAll();
  await Promise.all([
    safeStorage.removeItem(STORAGE_KEYS.ACCOUNTS),
    safeStorage.removeItem(STORAGE_KEYS.TRANSACTIONS),
    safeStorage.removeItem(STORAGE_KEYS.BUDGETS),
    safeStorage.removeItem(STORAGE_KEYS.GOALS),
    safeStorage.removeItem(STORAGE_KEYS.RULES),
    safeStorage.removeItem(STORAGE_KEYS.CATEGORIES),
    safeStorage.removeItem("POCKETLY_GUEST_PROFILE"),
    safeStorage.removeItem("POCKETLY_GUEST_POPUP_SEEN"),
  ]);
}

export async function exportAllLocalGuestData() {
  const [accounts, transactions, categories, budgets, goals, rules] =
    await Promise.all([
      getLocalAccounts(),
      getLocalTransactions(),
      getLocalCategories(),
      getLocalBudgets(),
      getLocalGoals(),
      getLocalMoneyRules(),
    ]);

  return {
    accounts,
    transactions,
    categories,
    budgets,
    goals,
    rules,
  };
}
