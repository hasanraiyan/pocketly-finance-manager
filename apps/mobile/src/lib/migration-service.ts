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
import { safeStorage } from "./safe-storage";

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
    guestProfileRaw,
  ] = await Promise.all([
    exportAllLocalGuestData(),
    getLocalBudgets(),
    getLocalGoals(),
    safeStorage.getItem("POCKETLY_GUEST_PROFILE"),
  ]);

  // 0. Update Profile Preferences (e.g. INR Currency, Name) if set locally
  if (guestProfileRaw) {
    try {
      const guestProfile = JSON.parse(guestProfileRaw);
      if (guestProfile.currency || guestProfile.name) {
        onProgress?.("Syncing currency & profile...");
        await client.PATCH("/users/me", {
          body: {
            currency: guestProfile.currency || undefined,
            name: guestProfile.name !== "Guest User" ? guestProfile.name : undefined,
          },
        });
      }
    } catch {
      // Continue if profile update fails
    }
  }

  onProgress?.("Mapping categories...");

  // 1. Fetch existing cloud categories
  const cloudCatsRes = await client.GET("/categories", {
    params: { query: { limit: 100 } },
  });
  const cloudCats = cloudCatsRes.data?.data?.items ?? [];
  const categoryMap = new Map<string, string>(); // localCatId -> cloudCatId

  // Map or create categories in cloud
  for (const localCat of localCats) {
    const existing = cloudCats.find(
      (c) => c.name.toLowerCase() === localCat.name.toLowerCase() && c.type === localCat.type,
    );
    if (existing) {
      categoryMap.set(localCat._id, existing._id);
    } else {
      try {
        const created = await client.POST("/categories", {
          body: {
            name: localCat.name,
            type: localCat.type,
            color: localCat.color,
            icon: localCat.icon,
          },
        });
        if (created.data?.data?._id) {
          categoryMap.set(localCat._id, created.data.data._id);
        }
      } catch {
        const fallback = cloudCats.find((c) => c.type === localCat.type) || cloudCats[0];
        if (fallback) categoryMap.set(localCat._id, fallback._id);
      }
    }
  }

  onProgress?.("Mapping accounts...");

  // 2. Fetch existing cloud accounts
  const cloudAccsRes = await client.GET("/accounts", {
    params: { query: { limit: 100 } },
  });
  const cloudAccs = cloudAccsRes.data?.data?.items ?? [];
  const accountMap = new Map<string, string>(); // localAccId -> cloudAccId
  let migratedAccounts = 0;

  // Map or create accounts in cloud
  for (const localAcc of localAccounts) {
    const existing = cloudAccs.find(
      (a) => a.name.toLowerCase() === localAcc.name.toLowerCase(),
    );
    if (existing) {
      accountMap.set(localAcc._id, existing._id);
    } else {
      try {
        const created = await client.POST("/accounts", {
          body: {
            name: localAcc.name,
            type: (localAcc.type as "wallet" | "bank" | "cash" | "savings" | "upi" | "credit_card") || "cash",
            initialBalance: localAcc.balance || 0,
            currency: localAcc.currency || "USD",
            icon: localAcc.icon,
          },
        });
        if (created.data?.data?._id) {
          accountMap.set(localAcc._id, created.data.data._id);
          migratedAccounts++;
        }
      } catch {
        const fallback = cloudAccs[0];
        if (fallback) accountMap.set(localAcc._id, fallback._id);
      }
    }
  }

  onProgress?.("Syncing budgets & goals...");

  // 3. Migrate Budgets
  let migratedBudgets = 0;
  for (const budget of localBudgets) {
    const cloudCatId = categoryMap.get(budget.categoryId);
    if (cloudCatId) {
      try {
        await client.POST("/budgets", {
          body: {
            categoryId: cloudCatId,
            amount: budget.amount,
            period: (budget.period as "monthly" | "weekly" | "yearly") || "monthly",
          },
        });
        migratedBudgets++;
      } catch {
        // Skip duplicate budgets
      }
    }
  }

  // 4. Migrate Goals
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
      // Continue
    }
  }

  onProgress?.("Uploading transactions...");

  // 5. Upload Transactions
  let migratedTransactions = 0;
  for (const tx of localTxs) {
    const cloudAccId = accountMap.get(tx.accountId) || cloudAccs[0]?._id;
    const cloudCatId = tx.categoryId ? (categoryMap.get(tx.categoryId) || cloudCats[0]?._id) : undefined;
    const cloudToAccId = tx.toAccountId ? accountMap.get(tx.toAccountId) : undefined;

    if (cloudAccId && (tx.type === "transfer" || cloudCatId)) {
      try {
        await client.POST("/transactions", {
          body: {
            type: tx.type,
            amount: tx.amount,
            date: tx.date,
            accountId: cloudAccId,
            toAccountId: cloudToAccId,
            categoryId: tx.type !== "transfer" ? cloudCatId : undefined,
            description: tx.description,
            note: tx.note,
          },
        });
        migratedTransactions++;
      } catch {
        // Continue
      }
    }
  }

  // 6. Clean up local guest data once successfully migrated
  await clearAllLocalGuestData();

  return {
    migratedTransactions,
    migratedAccounts,
    migratedBudgets,
    migratedGoals,
  };
}
