import { cache } from "react";
import { getServerApiClient } from "@/lib/api-client";

/**
 * Each dashboard block fetches what it needs so the blocks can stream in
 * independently rather than the page waiting on the slowest call.
 *
 * Several blocks need the same profile and account list, so those go
 * through React's `cache()`: deduped within a single request render, not
 * across requests. Cross-request caching would be wrong here -- every
 * response is per-user and authenticated.
 */

export const getProfile = cache(async () => {
  const client = await getServerApiClient();
  return client.GET("/users/me");
});

/**
 * The full account list. The balance card sums it and the accounts card
 * shows the first few, so it must not be fetched pre-truncated -- see the
 * comment in `BalanceCard`.
 */
export const getAccounts = cache(async () => {
  const client = await getServerApiClient();
  return client.GET("/accounts", { params: { query: { limit: 100 } } });
});

export const getOverview = cache(async () => {
  const client = await getServerApiClient();
  return client.GET("/analysis");
});

export const getInsights = cache(async () => {
  const client = await getServerApiClient();
  return client.GET("/analysis/insights");
});

export const getBudgets = cache(async () => {
  const client = await getServerApiClient();
  return client.GET("/budgets", { params: { query: { limit: 4 } } });
});

export const getRecentTransactions = cache(async () => {
  const client = await getServerApiClient();
  return client.GET("/transactions", { params: { query: { limit: 6 } } });
});

/** Display currency, falling back to INR when the profile can't be read. */
export async function getCurrency() {
  const { data } = await getProfile();
  return data?.data.currency ?? "INR";
}
