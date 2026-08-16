"use client";

import { useQuery } from "@tanstack/react-query";
import type { components } from "@pocketly/sdk";
import { usePocketlyClient } from "@/lib/use-pocketly-client";

export type AnalysisPeriod =
  | "7d"
  | "this_month"
  | "last_month"
  | "3m"
  | "6m"
  | "this_year"
  | "custom";
export type Overview = components["schemas"]["OverviewDto"]["data"];
export type CategoryBreakdown =
  components["schemas"]["CategoryBreakdownDto"]["data"];
export type CashFlow = components["schemas"]["CashFlowDto"]["data"];
export type AccountBreakdown =
  components["schemas"]["AccountBreakdownDto"]["data"];

const EMPTY_PERIOD = { start: "", end: "" };

export function useAnalysisOverview(
  period: AnalysisPeriod,
  initialData: Overview = {
    period: EMPTY_PERIOD,
    income: 0,
    expense: 0,
    net: 0,
  },
) {
  const client = usePocketlyClient();
  return useQuery({
    queryKey: ["analysis", "overview", period],
    queryFn: async () => {
      const { data, error } = await client.GET("/analysis", {
        params: { query: { period } },
      });
      if (error) throw error;
      return data.data;
    },
    initialData,
  });
}

export function useCategoryBreakdown(
  period: AnalysisPeriod,
  initialData: CategoryBreakdown = {
    period: EMPTY_PERIOD,
    categories: [],
  },
) {
  const client = usePocketlyClient();
  return useQuery({
    queryKey: ["analysis", "categories", period],
    queryFn: async () => {
      const { data, error } = await client.GET("/analysis/categories", {
        params: { query: { period } },
      });
      if (error) throw error;
      return data.data;
    },
    initialData,
  });
}

export function useCashFlow(
  period: AnalysisPeriod,
  initialData: CashFlow = { period: EMPTY_PERIOD, days: [] },
) {
  const client = usePocketlyClient();
  return useQuery({
    queryKey: ["analysis", "cash-flow", period],
    queryFn: async () => {
      const { data, error } = await client.GET("/analysis/cash-flow", {
        params: { query: { period } },
      });
      if (error) throw error;
      return data.data;
    },
    initialData,
  });
}

export function useAccountBreakdown(
  period: AnalysisPeriod,
  initialData: AccountBreakdown = { period: EMPTY_PERIOD, accounts: [] },
) {
  const client = usePocketlyClient();
  return useQuery({
    queryKey: ["analysis", "accounts", period],
    queryFn: async () => {
      const { data, error } = await client.GET("/analysis/accounts", {
        params: { query: { period } },
      });
      if (error) throw error;
      return data.data;
    },
    initialData,
  });
}
