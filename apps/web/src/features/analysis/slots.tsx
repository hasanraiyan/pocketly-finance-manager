import { cache } from "react";
import { getServerApiClient } from "@/lib/api-client";
import { DEFAULT_PERIOD } from "./constants";
import {
  AccountBreakdownCard,
  CashFlowCard,
  CategoryBreakdownCard,
  StatCards,
} from "./sections";

/**
 * Server-side seams between the page and the client sections. Each slot
 * fetches only what its own card needs, so each `<Suspense>` boundary in
 * `page.tsx` resolves on its own schedule instead of every card waiting on
 * the slowest aggregate.
 *
 * Only the default period is fetched here -- once you pick a different
 * one, the sections take over client-side via react-query.
 *
 * A failed call passes `undefined` rather than a zero-filled stand-in, so
 * the section shows its loading and error states instead of presenting
 * zeros as though they were real figures.
 */

const period = DEFAULT_PERIOD;

/** Needed by three of the four cards, so deduped per request. */
const getCurrency = cache(async () => {
  const client = await getServerApiClient();
  const { data } = await client.GET("/users/me");
  return data?.data.currency ?? "INR";
});

const getCategories = cache(async () => {
  const client = await getServerApiClient();
  const { data } = await client.GET("/categories", {
    params: { query: { limit: 100 } },
  });
  return data?.data.items ?? [];
});

export async function StatCardsSlot() {
  const client = await getServerApiClient();
  const [{ data }, currency] = await Promise.all([
    client.GET("/analysis", { params: { query: { period } } }),
    getCurrency(),
  ]);

  return (
    <StatCards initialData={data?.data} currency={currency} />
  );
}

export async function CashFlowSlot() {
  const client = await getServerApiClient();
  const { data } = await client.GET("/analysis/cash-flow", {
    params: { query: { period } },
  });

  return (
    <CashFlowCard initialData={data?.data} />
  );
}

export async function CategoryBreakdownSlot() {
  const client = await getServerApiClient();
  const [{ data }, categories, currency] = await Promise.all([
    client.GET("/analysis/categories", { params: { query: { period } } }),
    getCategories(),
    getCurrency(),
  ]);

  return (
    <CategoryBreakdownCard
      initialData={data?.data}
      categories={categories}
      currency={currency}
    />
  );
}

export async function AccountBreakdownSlot() {
  const client = await getServerApiClient();
  const [{ data }, currency] = await Promise.all([
    client.GET("/analysis/accounts", { params: { query: { period } } }),
    getCurrency(),
  ]);

  return (
    <AccountBreakdownCard
      initialData={data?.data}
      currency={currency}
    />
  );
}
