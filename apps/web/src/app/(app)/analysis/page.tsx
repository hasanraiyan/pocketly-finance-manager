import { getServerApiClient } from "@/lib/api-client";
import { AnalysisView } from "@/features/analysis/analysis-view";

export default async function AnalysisPage() {
  const client = await getServerApiClient();
  const [
    profileRes,
    overviewRes,
    cashFlowRes,
    categoryBreakdownRes,
    accountBreakdownRes,
    categoriesRes,
  ] = await Promise.all([
    client.GET("/users/me"),
    client.GET("/analysis", { params: { query: { period: "this_month" } } }),
    client.GET("/analysis/cash-flow", {
      params: { query: { period: "this_month" } },
    }),
    client.GET("/analysis/categories", {
      params: { query: { period: "this_month" } },
    }),
    client.GET("/analysis/accounts", {
      params: { query: { period: "this_month" } },
    }),
    client.GET("/categories", { params: { query: { limit: 100 } } }),
  ]);

  return (
    <AnalysisView
      initialOverview={
        overviewRes.data?.data ?? {
          period: { start: "", end: "" },
          income: 0,
          expense: 0,
          net: 0,
        }
      }
      initialCashFlow={cashFlowRes.data?.data ?? { period: { start: "", end: "" }, days: [] }}
      initialCategoryBreakdown={
        categoryBreakdownRes.data?.data ?? {
          period: { start: "", end: "" },
          categories: [],
        }
      }
      initialAccountBreakdown={
        accountBreakdownRes.data?.data ?? {
          period: { start: "", end: "" },
          accounts: [],
        }
      }
      categories={categoriesRes.data?.data.items ?? []}
      currency={profileRes.data?.data.currency ?? "INR"}
    />
  );
}
