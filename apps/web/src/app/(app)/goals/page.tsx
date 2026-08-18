import { getServerApiClient } from "@/lib/api-client";
import { getServerSession } from "@/lib/get-session";
import { GoalsView } from "@/features/goals/goals-view";

export default async function GoalsPage() {
  const session = await getServerSession();
  const isGuest = Boolean(session?.isGuest);

  if (isGuest) {
    return (
      <GoalsView
        initialData={[]}
        initialLoadFailed={false}
        accounts={[]}
        currency="USD"
      />
    );
  }

  const client = await getServerApiClient();
  const [profileRes, goalsRes, accountsRes] = await Promise.all([
    client.GET("/users/me"),
    client.GET("/goals", { params: { query: { limit: 100 } } }),
    client.GET("/accounts", { params: { query: { limit: 100 } } }),
  ]);

  return (
    <GoalsView
      initialData={goalsRes.data?.data.items ?? []}
      initialLoadFailed={Boolean(goalsRes.error)}
      accounts={accountsRes.data?.data.items ?? []}
      currency={profileRes.data?.data.currency ?? "INR"}
    />
  );
}
