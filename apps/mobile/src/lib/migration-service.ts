import type { createPocketlyClient } from "@pocketly/sdk";
import {
  clearAllLocalGuestData,
  exportAllLocalGuestData,
  getLocalAccounts,
  getLocalCategories,
  getLocalTransactions,
} from "./local-storage-adapter";

type PocketlyClient = ReturnType<typeof createPocketlyClient>;

export interface MigrationSummary {
  hasData: boolean;
  transactionCount: number;
  accountCount: number;
  categoryCount: number;
}

/**
 * Check if the user has meaningful local data created during guest mode
 */
export async function getLocalDataSummary(): Promise<MigrationSummary> {
  const [txs, accounts, cats] = await Promise.all([
    getLocalTransactions(),
    getLocalAccounts(),
    getLocalCategories(),
  ]);

  const hasData = txs.length > 0;
  return {
    hasData,
    transactionCount: txs.length,
    accountCount: accounts.length,
    categoryCount: cats.length,
  };
}

/**
 * Migrates local guest categories, accounts, and transactions to the authenticated cloud account
 */
export async function migrateLocalDataToCloud(
  client: PocketlyClient,
  onProgress?: (step: string) => void,
): Promise<{ migratedTransactions: number }> {
  const { accounts: localAccounts, transactions: localTxs, categories: localCats } =
    await exportAllLocalGuestData();

  if (localTxs.length === 0 && localAccounts.length === 0) {
    await clearAllLocalGuestData();
    return { migratedTransactions: 0 };
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
        // Fallback to first available category of same type
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
        }
      } catch {
        const fallback = cloudAccs[0];
        if (fallback) accountMap.set(localAcc._id, fallback._id);
      }
    }
  }

  onProgress?.("Uploading transactions...");

  // 3. Upload transactions
  let migratedCount = 0;
  for (const tx of localTxs) {
    const cloudAccId = accountMap.get(tx.accountId) || cloudAccs[0]?._id;
    const cloudCatId = categoryMap.get(tx.categoryId) || cloudCats[0]?._id;
    const cloudToAccId = tx.toAccountId ? accountMap.get(tx.toAccountId) : undefined;

    if (cloudAccId && cloudCatId) {
      try {
        await client.POST("/transactions", {
          body: {
            type: tx.type,
            amount: tx.amount,
            date: tx.date,
            accountId: cloudAccId,
            categoryId: cloudCatId,
            toAccountId: cloudToAccId,
            note: tx.note,
          },
        });
        migratedCount++;
      } catch {
        // Continue uploading remaining records
      }
    }
  }

  // 4. Clean up local guest data once successfully migrated
  await clearAllLocalGuestData();

  return { migratedTransactions: migratedCount };
}
