import { getServerApiClient } from "@/lib/api-client";
import { AccountsView } from "@/features/accounts/accounts-view";

export default async function AccountsPage() {
  const client = await getServerApiClient();
  const { data, error } = await client.GET("/accounts", {
    params: { query: { limit: 100 } },
  });

  return (
    <AccountsView
      initialData={data?.data.items ?? []}
      initialLoadFailed={Boolean(error)}
    />
  );
}
