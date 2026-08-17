"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
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

/**
 * `initialData` is genuinely optional across these hooks. It used to
 * default to a zero-filled object, which made react-query believe it
 * already had data for a period it had never fetched -- so changing the
 * period painted ₹0.00 for a moment before the real figures landed.
 *
 * `keepPreviousData` covers the gap instead: the previous period's numbers
 * stay on screen, dimmed by the caller via `isPlaceholderData`, until the
 * new ones arrive. Nothing flashes and nothing shifts.
 */
export function useAnalysisOverview(
  period: AnalysisPeriod,
  initialData?: Overview,
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
    placeholderData: keepPreviousData,
  });
}

export function useCategoryBreakdown(
  period: AnalysisPeriod,
  initialData?: CategoryBreakdown,
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
    placeholderData: keepPreviousData,
  });
}

export function useCashFlow(
  period: AnalysisPeriod,
  initialData?: CashFlow,
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
    placeholderData: keepPreviousData,
  });
}

export function useAccountBreakdown(
  period: AnalysisPeriod,
  initialData?: AccountBreakdown,
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
    placeholderData: keepPreviousData,
  });
}
