import { getServerApiClient } from "@/lib/api-client";
import { getServerSession } from "@/lib/get-session";
import { AccountsView } from "@/features/accounts/accounts-view";

export default async function AccountsPage() {
  const session = await getServerSession();
  const isGuest = Boolean(session?.isGuest);
  const client = await getServerApiClient();
  const { data, error } = isGuest
    ? { data: null, error: null }
    : await client.GET("/accounts", {
        params: { query: { limit: 100 } },
      });

  return (
    <AccountsView
      initialData={data?.data.items ?? []}
      initialLoadFailed={!isGuest && Boolean(error)}
    />
  );
}
