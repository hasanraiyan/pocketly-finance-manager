import { getServerApiClient } from "@/lib/api-client";
import { SettingsView } from "@/features/settings/settings-view";

export default async function SettingsPage() {
  const client = await getServerApiClient();
  const [profileRes, categoriesRes] = await Promise.all([
    client.GET("/users/me"),
    client.GET("/categories", { params: { query: { limit: 100 } } }),
  ]);

  const profile = profileRes.data?.data;

  return (
    <SettingsView
      currency={profile?.currency ?? "INR"}
      timezone={profile?.timezone ?? "UTC"}
      profileLoadFailed={Boolean(profileRes.error)}
      categoriesInitialData={categoriesRes.data?.data.items ?? []}
      categoriesLoadFailed={Boolean(categoriesRes.error)}
    />
  );
}
