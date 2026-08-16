import { getServerApiClient } from "@/lib/api-client";
import { PlanningView } from "@/features/budgets/planning-view";

export default async function PlanningPage() {
  const client = await getServerApiClient();
  const [profileRes, budgetsRes, categoriesRes] = await Promise.all([
    client.GET("/users/me"),
    client.GET("/budgets", { params: { query: { limit: 100 } } }),
    client.GET("/categories", { params: { query: { limit: 100 } } }),
  ]);

  return (
    <PlanningView
      initialData={budgetsRes.data?.data.items ?? []}
      initialLoadFailed={Boolean(budgetsRes.error)}
      categories={categoriesRes.data?.data.items ?? []}
      currency={profileRes.data?.data.currency ?? "INR"}
    />
  );
}
