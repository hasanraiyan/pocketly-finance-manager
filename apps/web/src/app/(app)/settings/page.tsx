import { getServerApiClient } from "@/lib/api-client";
import { getServerSession } from "@/lib/get-session";
import { SettingsView } from "@/features/settings/settings-view";

export default async function SettingsPage() {
  const session = await getServerSession();
  const isGuest = Boolean(session?.isGuest);

  if (isGuest) {
    return (
      <SettingsView
        profile={{
          _id: "local_guest_user",
          name: "Guest User",
          email: "guest@pocketly.local",
          currency: "USD",
          timezone: "UTC",
          role: "user",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }}
        currency="USD"
        timezone="UTC"
        profileLoadFailed={false}
        categoriesInitialData={[]}
        categoriesLoadFailed={false}
      />
    );
  }

  const client = await getServerApiClient();
  const [profileRes, categoriesRes] = await Promise.all([
    client.GET("/users/me"),
    client.GET("/categories", { params: { query: { limit: 100 } } }),
  ]);

  const profile = profileRes.data?.data;

  return (
    <SettingsView
      profile={profile}
      currency={profile?.currency ?? "INR"}
      timezone={profile?.timezone ?? "UTC"}
      profileLoadFailed={Boolean(profileRes.error)}
      categoriesInitialData={categoriesRes.data?.data.items ?? []}
      categoriesLoadFailed={Boolean(categoriesRes.error)}
    />
  );
}
