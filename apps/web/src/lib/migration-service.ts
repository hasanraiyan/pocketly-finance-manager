import type { createPocketlyClient } from "@pocketly/sdk";
import {
  clearAllLocalGuestData,
  exportAllLocalGuestData,
  getLocalAccounts,
  getLocalBudgets,
  getLocalCategories,
  getLocalGoals,
  getLocalTransactions,
} from "./local-storage-adapter";

type PocketlyClient = ReturnType<typeof createPocketlyClient>;

export interface MigrationSummary {
  hasData: boolean;
  transactionCount: number;
  accountCount: number;
  categoryCount: number;
  budgetCount: number;
  goalCount: number;
}

/**
 * Check if the user has meaningful local data created during guest mode
 */
export async function getLocalDataSummary(): Promise<MigrationSummary> {
  if (typeof window === "undefined") {
    return {
      hasData: false,
      transactionCount: 0,
      accountCount: 0,
      categoryCount: 0,
      budgetCount: 0,
      goalCount: 0,
    };
  }

  const [txs, accounts, cats, budgets, goals] = await Promise.all([
    getLocalTransactions(),
    getLocalAccounts(),
    getLocalCategories(),
    getLocalBudgets(),
    getLocalGoals(),
  ]);

  const hasData = txs.length > 0 || accounts.length > 2 || goals.length > 0;
  return {
    hasData,
    transactionCount: txs.length,
    accountCount: accounts.length,
    categoryCount: cats.length,
    budgetCount: budgets.length,
    goalCount: goals.length,
  };
}

/**
 * Migrates local guest categories, accounts, budgets, goals, and transactions to the cloud
 */
export async function migrateLocalDataToCloud(
  client: PocketlyClient,
  onProgress?: (step: string) => void,
): Promise<{
  migratedTransactions: number;
  migratedAccounts: number;
  migratedBudgets: number;
  migratedGoals: number;
}> {
  const [
    { accounts: localAccounts, transactions: localTxs, categories: localCats },
    localBudgets,
    localGoals,
  ] = await Promise.all([
    exportAllLocalGuestData(),
    getLocalBudgets(),
    getLocalGoals(),
  ]);

  // ID mappings between local temporary IDs and server created IDs
  const accountIdMap = new Map<string, string>();
  const categoryIdMap = new Map<string, string>();

  // 1. Categories
  onProgress?.("Syncing categories...");
  const serverCatsRes = await client.GET("/categories", {
    params: { query: { limit: 100 } },
  });
  const serverCats = serverCatsRes.data?.data?.items || [];

  for (const cat of localCats) {
    const existing = serverCats.find(
      (c) => c.name.toLowerCase() === cat.name.toLowerCase(),
    );
    if (existing) {
      categoryIdMap.set(cat._id, existing._id);
    } else {
      try {
        const created = await client.POST("/categories", {
          body: {
            name: cat.name,
            type: cat.type,
            color: cat.color,
            icon: cat.icon,
          },
        });
        if (created.data?.data?._id) {
          categoryIdMap.set(cat._id, created.data.data._id);
        }
      } catch {
        // Continue if creation fails
      }
    }
  }

  // 2. Accounts
  onProgress?.("Syncing accounts...");
  const serverAccsRes = await client.GET("/accounts", {
    params: { query: { limit: 100 } },
  });
  const serverAccs = serverAccsRes.data?.data?.items || [];

  let migratedAccounts = 0;
  for (const acc of localAccounts) {
    const existing = serverAccs.find(
      (a) => a.name.toLowerCase() === acc.name.toLowerCase(),
    );
    if (existing) {
      accountIdMap.set(acc._id, existing._id);
    } else {
      try {
        const created = await client.POST("/accounts", {
          body: {
            name: acc.name,
            type: acc.type as "bank" | "cash" | "savings" | "upi" | "credit_card" | "wallet",
            initialBalance: acc.balance,
            currency: acc.currency,
            icon: acc.icon,
          },
        });
        if (created.data?.data?._id) {
          accountIdMap.set(acc._id, created.data.data._id);
          migratedAccounts++;
        }
      } catch {
        // Fallback to first available server account
        if (serverAccs.length > 0) {
          accountIdMap.set(acc._id, serverAccs[0]._id);
        }
      }
    }
  }

  // Fallback default account ID if not found
  const fallbackAccountId =
    serverAccs[0]?._id || Array.from(accountIdMap.values())[0];
  const fallbackCategoryId =
    serverCats[0]?._id || Array.from(categoryIdMap.values())[0];

  // 3. Budgets
  onProgress?.("Syncing budgets...");
  let migratedBudgets = 0;
  for (const bgt of localBudgets) {
    const targetCatId = categoryIdMap.get(bgt.categoryId) || fallbackCategoryId;
    if (targetCatId) {
      try {
        await client.POST("/budgets", {
          body: {
            categoryId: targetCatId,
            amount: bgt.amount,
            period: bgt.period,
          },
        });
        migratedBudgets++;
      } catch {
        // continue
      }
    }
  }

  // 4. Goals
  onProgress?.("Syncing goals...");
  let migratedGoals = 0;
  for (const goal of localGoals) {
    try {
      await client.POST("/goals", {
        body: {
          name: goal.name,
          targetAmount: goal.targetAmount,
          targetDate: goal.targetDate,
        },
      });
      migratedGoals++;
    } catch {
      // continue
    }
  }

  // 5. Transactions
  onProgress?.("Importing transactions...");
  let migratedTransactions = 0;
  // Sort oldest to newest to preserve balance history
  const sortedTxs = [...localTxs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  for (const tx of sortedTxs) {
    const accId = accountIdMap.get(tx.accountId) || fallbackAccountId;
    const catId = (tx.categoryId ? categoryIdMap.get(tx.categoryId) : undefined) || fallbackCategoryId;
    const toAccId = tx.toAccountId
      ? accountIdMap.get(tx.toAccountId)
      : undefined;

    if (accId && catId) {
      try {
        await client.POST("/transactions", {
          body: {
            amount: tx.amount,
            type: tx.type,
            date: tx.date,
            accountId: accId,
            categoryId: catId,
            toAccountId: toAccId,
            note: tx.note,
          },
        });
        migratedTransactions++;
      } catch {
        // continue
      }
    }
  }

  // Clear local guest storage once migrated
  await clearAllLocalGuestData();

  return {
    migratedTransactions,
    migratedAccounts,
    migratedBudgets,
    migratedGoals,
  };
}
