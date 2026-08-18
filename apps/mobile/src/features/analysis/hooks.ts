import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { components } from "@pocketly/sdk";
import { usePocketlyClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-provider";
import {
  getLocalAccounts,
  getLocalCategories,
  getLocalTransactions,
} from "@/lib/local-storage-adapter";

export type AnalysisPeriod =
  | "7d"
  | "this_month"
  | "last_month"
  | "3m"
  | "6m"
  | "this_year";

export type Overview = components["schemas"]["OverviewDto"]["data"];
export type CategoryBreakdown =
  components["schemas"]["CategoryBreakdownDto"]["data"];
export type CashFlow = components["schemas"]["CashFlowDto"]["data"];
export type AccountBreakdown =
  components["schemas"]["AccountBreakdownDto"]["data"];

export const PERIOD_OPTIONS: Array<{ value: AnalysisPeriod; label: string }> = [
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "7d", label: "7 Days" },
  { value: "3m", label: "3 Months" },
  { value: "6m", label: "6 Months" },
  { value: "this_year", label: "This Year" },
];

export function useAnalysisOverview(period: AnalysisPeriod) {
  const { isGuest } = useAuth();
  const client = usePocketlyClient();

  return useQuery({
    queryKey: ["analysis", "overview", period, isGuest],
    queryFn: async (): Promise<Overview> => {
      if (isGuest) {
        const txs = await getLocalTransactions();
        let income = 0;
        let expense = 0;
        txs.forEach((t) => {
          if (t.type === "income") income += t.amount;
          if (t.type === "expense") expense += t.amount;
        });
        const net = income - expense;
        return {
          period: { start: new Date().toISOString(), end: new Date().toISOString() },
          income,
          expense,
          net,
        } as unknown as Overview;
      }

      const { data, error } = await client.GET("/analysis", {
        params: { query: { period } },
      });
      if (error || !data) {
        throw new Error("Failed to load overview");
      }
      return data.data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useCategoryBreakdown(period: AnalysisPeriod) {
  const { isGuest } = useAuth();
  const client = usePocketlyClient();

  return useQuery({
    queryKey: ["analysis", "categories", period, isGuest],
    queryFn: async (): Promise<CategoryBreakdown> => {
      if (isGuest) {
        const [txs, cats] = await Promise.all([
          getLocalTransactions(),
          getLocalCategories(),
        ]);
        const map = new Map<string, { total: number; count: number; name: string; type: "income" | "expense"; color?: string }>();
        cats.forEach((c) => {
          map.set(c._id, { total: 0, count: 0, name: c.name, type: c.type, color: c.color });
        });
        txs.forEach((t) => {
          const entry = map.get(t.categoryId);
          if (entry) {
            entry.total += t.amount;
            entry.count += 1;
          }
        });
        const categories = Array.from(map.entries())
          .filter(([_, v]) => v.total > 0)
          .map(([id, v]) => ({
            categoryId: id,
            categoryName: v.name,
            total: v.total,
            count: v.count,
            type: v.type,
            color: v.color,
          }));
        return {
          period: { start: new Date().toISOString(), end: new Date().toISOString() },
          categories,
        } as unknown as CategoryBreakdown;
      }

      const { data, error } = await client.GET("/analysis/categories", {
        params: { query: { period } },
      });
      if (error || !data) {
        throw new Error("Failed to load categories breakdown");
      }
      return data.data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useCashFlow(period: AnalysisPeriod) {
  const { isGuest } = useAuth();
  const client = usePocketlyClient();

  return useQuery({
    queryKey: ["analysis", "cash-flow", period, isGuest],
    queryFn: async (): Promise<CashFlow> => {
      if (isGuest) {
        return {
          period: { start: new Date().toISOString(), end: new Date().toISOString() },
          days: [],
        } as unknown as CashFlow;
      }

      const { data, error } = await client.GET("/analysis/cash-flow", {
        params: { query: { period } },
      });
      if (error || !data) {
        throw new Error("Failed to load cash flow");
      }
      return data.data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useAccountBreakdown(period: AnalysisPeriod) {
  const { isGuest } = useAuth();
  const client = usePocketlyClient();

  return useQuery({
    queryKey: ["analysis", "accounts", period, isGuest],
    queryFn: async (): Promise<AccountBreakdown> => {
      if (isGuest) {
        const accs = await getLocalAccounts();
        return {
          accounts: accs.map((a) => ({
            accountId: a._id,
            name: a.name,
            income: 0,
            expense: 0,
          })),
        } as unknown as AccountBreakdown;
      }

      const { data, error } = await client.GET("/analysis/accounts", {
        params: { query: { period } },
      });
      if (error || !data) {
        throw new Error("Failed to load accounts breakdown");
      }
      return data.data;
    },
    placeholderData: keepPreviousData,
  });
}
