import { safeStorage } from "./safe-storage";

export interface LocalCategory {
  _id: string;
  name: string;
  type: "expense" | "income";
  color?: string;
  icon?: string;
}

export interface LocalAccount {
  _id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  icon?: string;
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
}

export interface LocalBudget {
  _id: string;
  categoryId: string;
  amount: number;
  period: "monthly" | "weekly" | "yearly";
  spent?: number;
}

export interface LocalGoal {
  _id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  status: "in_progress" | "reached" | "stalled";
  targetDate?: string;
}

export interface LocalMoneyRule {
  _id: string;
  type: string;
  enabled: boolean;
  amount?: number;
  categoryId?: string;
  accountId?: string;
  lastFiredAt?: string;
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
  { _id: "cat_food", name: "Food & Dining", type: "expense", color: "#f59e0b", icon: "coffee" },
  { _id: "cat_groceries", name: "Groceries", type: "expense", color: "#10b981", icon: "shopping-bag" },
  { _id: "cat_housing", name: "Housing & Rent", type: "expense", color: "#3b82f6", icon: "home" },
  { _id: "cat_transport", name: "Transport", type: "expense", color: "#8b5cf6", icon: "truck" },
  { _id: "cat_utilities", name: "Utilities", type: "expense", color: "#ec4899", icon: "zap" },
  { _id: "cat_entertainment", name: "Entertainment", type: "expense", color: "#06b6d4", icon: "film" },
  { _id: "cat_shopping", name: "Shopping", type: "expense", color: "#f43f5e", icon: "gift" },
  { _id: "cat_salary", name: "Salary", type: "income", color: "#10b981", icon: "briefcase" },
  { _id: "cat_freelance", name: "Freelance", type: "income", color: "#3b82f6", icon: "dollar-sign" },
  { _id: "cat_investments", name: "Investments", type: "income", color: "#8b5cf6", icon: "trending-up" },
];

const DEFAULT_ACCOUNTS: LocalAccount[] = [
  { _id: "acc_cash", name: "Cash Wallet", type: "cash", balance: 0, currency: "USD", icon: "wallet" },
  { _id: "acc_checking", name: "Main Checking", type: "bank", balance: 0, currency: "USD", icon: "credit-card" },
];

// Helper for unique local ID generation
export function generateLocalId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

// 1. Initial Seed Data
export async function ensureLocalSeedData() {
  const existingCats = await safeStorage.getItem(STORAGE_KEYS.CATEGORIES);
  if (!existingCats) {
    await safeStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
  }
  const existingAccs = await safeStorage.getItem(STORAGE_KEYS.ACCOUNTS);
  if (!existingAccs) {
    await safeStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(DEFAULT_ACCOUNTS));
  }
}

// 2. Categories CRUD
export async function getLocalCategories(): Promise<LocalCategory[]> {
  await ensureLocalSeedData();
  const data = await safeStorage.getItem(STORAGE_KEYS.CATEGORIES);
  return data ? JSON.parse(data) : DEFAULT_CATEGORIES;
}

export async function saveLocalCategory(cat: Omit<LocalCategory, "_id"> & { _id?: string }): Promise<LocalCategory> {
  const list = await getLocalCategories();
  const id = cat._id || generateLocalId("cat");
  const newCat: LocalCategory = { ...cat, _id: id };
  const updated = cat._id ? list.map((c) => (c._id === id ? newCat : c)) : [newCat, ...list];
  await safeStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updated));
  return newCat;
}

export async function deleteLocalCategory(id: string): Promise<void> {
  const list = await getLocalCategories();
  await safeStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(list.filter((c) => c._id !== id)));
}

// 3. Accounts CRUD
export async function getLocalAccounts(): Promise<LocalAccount[]> {
  await ensureLocalSeedData();
  const data = await safeStorage.getItem(STORAGE_KEYS.ACCOUNTS);
  return data ? JSON.parse(data) : DEFAULT_ACCOUNTS;
}

export async function saveLocalAccount(acc: Omit<LocalAccount, "_id"> & { _id?: string }): Promise<LocalAccount> {
  const list = await getLocalAccounts();
  const id = acc._id || generateLocalId("acc");
  const newAcc: LocalAccount = { ...acc, _id: id };
  const updated = acc._id ? list.map((a) => (a._id === id ? newAcc : a)) : [newAcc, ...list];
  await safeStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(updated));
  return newAcc;
}

export async function deleteLocalAccount(id: string): Promise<void> {
  const list = await getLocalAccounts();
  await safeStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(list.filter((a) => a._id !== id)));
}

// 4. Transactions CRUD
export async function getLocalTransactions(): Promise<LocalTransaction[]> {
  const data = await safeStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  return data ? JSON.parse(data) : [];
}

export async function saveLocalTransaction(tx: Omit<LocalTransaction, "_id"> & { _id?: string }): Promise<LocalTransaction> {
  const list = await getLocalTransactions();
  const id = tx._id || generateLocalId("tx");
  const newTx: LocalTransaction = { ...tx, _id: id };
  const updated = tx._id ? list.map((t) => (t._id === id ? newTx : t)) : [newTx, ...list];
  await safeStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));

  // Auto-update Account Balances
  const accounts = await getLocalAccounts();
  const acc = accounts.find((a) => a._id === tx.accountId);
  if (acc) {
    if (tx.type === "expense") {
      acc.balance -= tx.amount;
    } else if (tx.type === "income") {
      acc.balance += tx.amount;
    }
    await safeStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  }

  return newTx;
}

export async function deleteLocalTransaction(id: string): Promise<void> {
  const list = await getLocalTransactions();
  await safeStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(list.filter((t) => t._id !== id)));
}

// 5. Budgets CRUD
export async function getLocalBudgets(): Promise<LocalBudget[]> {
  const data = await safeStorage.getItem(STORAGE_KEYS.BUDGETS);
  const budgets: LocalBudget[] = data ? JSON.parse(data) : [];
  const transactions = await getLocalTransactions();

  // Compute spent per budget category
  return budgets.map((b) => {
    const spent = transactions
      .filter((t) => t.type === "expense" && t.categoryId === b.categoryId)
      .reduce((sum, t) => sum + t.amount, 0);
    return { ...b, spent };
  });
}

export async function saveLocalBudget(budget: Omit<LocalBudget, "_id"> & { _id?: string }): Promise<LocalBudget> {
  const list = await getLocalBudgets();
  const id = budget._id || generateLocalId("budget");
  const newBudget: LocalBudget = { ...budget, _id: id };
  const updated = budget._id ? list.map((b) => (b._id === id ? newBudget : b)) : [newBudget, ...list];
  await safeStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(updated));
  return newBudget;
}

export async function deleteLocalBudget(id: string): Promise<void> {
  const list = await getLocalBudgets();
  await safeStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(list.filter((b) => b._id !== id)));
}

// 6. Goals CRUD
export async function getLocalGoals(): Promise<LocalGoal[]> {
  const data = await safeStorage.getItem(STORAGE_KEYS.GOALS);
  return data ? JSON.parse(data) : [];
}

export async function saveLocalGoal(goal: Omit<LocalGoal, "_id"> & { _id?: string }): Promise<LocalGoal> {
  const list = await getLocalGoals();
  const id = goal._id || generateLocalId("goal");
  const newGoal: LocalGoal = { ...goal, _id: id };
  const updated = goal._id ? list.map((g) => (g._id === id ? newGoal : g)) : [newGoal, ...list];
  await safeStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(updated));
  return newGoal;
}

export async function contributeLocalGoal(id: string, amount: number): Promise<LocalGoal> {
  const list = await getLocalGoals();
  const goal = list.find((g) => g._id === id);
  if (!goal) throw new Error("Goal not found");
  goal.savedAmount += amount;
  if (goal.savedAmount >= goal.targetAmount) {
    goal.status = "reached";
  }
  await safeStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(list));
  return goal;
}

export async function deleteLocalGoal(id: string): Promise<void> {
  const list = await getLocalGoals();
  await safeStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(list.filter((g) => g._id !== id)));
}

// 7. Money Rules CRUD
export async function getLocalMoneyRules(): Promise<LocalMoneyRule[]> {
  const data = await safeStorage.getItem(STORAGE_KEYS.RULES);
  return data ? JSON.parse(data) : [];
}

export async function saveLocalMoneyRule(rule: Omit<LocalMoneyRule, "_id"> & { _id?: string }): Promise<LocalMoneyRule> {
  const list = await getLocalMoneyRules();
  const id = rule._id || generateLocalId("rule");
  const newRule: LocalMoneyRule = { ...rule, _id: id };
  const updated = rule._id ? list.map((r) => (r._id === id ? newRule : r)) : [newRule, ...list];
  await safeStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(updated));
  return newRule;
}

export async function deleteLocalMoneyRule(id: string): Promise<void> {
  const list = await getLocalMoneyRules();
  await safeStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(list.filter((r) => r._id !== id)));
}

// 8. Overview & Analysis Aggregates for Local Mode
export async function getLocalOverview() {
  const txs = await getLocalTransactions();
  let income = 0;
  let expense = 0;
  txs.forEach((t) => {
    if (t.type === "income") income += t.amount;
    if (t.type === "expense") expense += t.amount;
  });
  return { income, expense, net: income - expense };
}

// 9. Export all local records for cloud migration
export async function exportAllLocalGuestData() {
  const [accounts, transactions, budgets, goals, categories] = await Promise.all([
    getLocalAccounts(),
    getLocalTransactions(),
    getLocalBudgets(),
    getLocalGoals(),
    getLocalCategories(),
  ]);
  return { accounts, transactions, budgets, goals, categories };
}

// Clear all local guest data
export async function clearAllLocalGuestData() {
  await Promise.all([
    safeStorage.removeItem(STORAGE_KEYS.ACCOUNTS),
    safeStorage.removeItem(STORAGE_KEYS.TRANSACTIONS),
    safeStorage.removeItem(STORAGE_KEYS.BUDGETS),
    safeStorage.removeItem(STORAGE_KEYS.GOALS),
    safeStorage.removeItem(STORAGE_KEYS.RULES),
    safeStorage.removeItem(STORAGE_KEYS.CATEGORIES),
  ]);
}
