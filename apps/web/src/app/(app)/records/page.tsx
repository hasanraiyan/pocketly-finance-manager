import { getServerApiClient } from "@/lib/api-client";
import { RecordsView } from "@/features/transactions/records-view";

export default async function RecordsPage() {
  const client = await getServerApiClient();
  const [profileRes, transactionsRes, accountsRes, categoriesRes] =
    await Promise.all([
      client.GET("/users/me"),
      client.GET("/transactions", { params: { query: { limit: 20 } } }),
      client.GET("/accounts", { params: { query: { limit: 100 } } }),
      client.GET("/categories", { params: { query: { limit: 100 } } }),
    ]);

  return (
    <RecordsView
      initialData={{
        items: transactionsRes.data?.data.items ?? [],
        nextCursor: transactionsRes.data?.data.nextCursor ?? null,
      }}
      initialLoadFailed={Boolean(transactionsRes.error)}
      accounts={accountsRes.data?.data.items ?? []}
      categories={categoriesRes.data?.data.items ?? []}
      currency={profileRes.data?.data.currency ?? "INR"}
    />
  );
}
