import { getServerApiClient } from "@/lib/api-client";
import { PlanningView } from "@/features/budgets/planning-view";

export default async function PlanningPage() {
  const client = await getServerApiClient();
  const [
    profileRes,
    budgetsRes,
    categoriesRes,
    accountsRes,
    recurrencesRes,
    moneyRulesRes,
  ] = await Promise.all([
    client.GET("/users/me"),
    client.GET("/budgets", { params: { query: { limit: 100 } } }),
    client.GET("/categories", { params: { query: { limit: 100 } } }),
    client.GET("/accounts", { params: { query: { limit: 100 } } }),
    client.GET("/recurrences", { params: { query: { limit: 100 } } }),
    client.GET("/money-rules", { params: { query: { limit: 100 } } }),
  ]);

  return (
    <PlanningView
      initialData={budgetsRes.data?.data.items ?? []}
      initialLoadFailed={Boolean(budgetsRes.error)}
      categories={categoriesRes.data?.data.items ?? []}
      accounts={accountsRes.data?.data.items ?? []}
      recurrences={recurrencesRes.data?.data.items ?? []}
      recurrencesLoadFailed={Boolean(recurrencesRes.error)}
      moneyRules={moneyRulesRes.data?.data.items ?? []}
      moneyRulesLoadFailed={Boolean(moneyRulesRes.error)}
      currency={profileRes.data?.data.currency ?? "INR"}
    />
  );
}
