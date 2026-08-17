import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { components } from "@pocketly/sdk";
import { usePocketlyClient } from "@/lib/api-client";

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
  const client = usePocketlyClient();
  return useQuery({
    queryKey: ["analysis", "overview", period],
    queryFn: async () => {
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
  const client = usePocketlyClient();
  return useQuery({
    queryKey: ["analysis", "categories", period],
    queryFn: async () => {
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
  const client = usePocketlyClient();
  return useQuery({
    queryKey: ["analysis", "cash-flow", period],
    queryFn: async () => {
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
  const client = usePocketlyClient();
  return useQuery({
    queryKey: ["analysis", "accounts", period],
    queryFn: async () => {
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
