import { currentUser } from "@clerk/nextjs/server";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
};

/**
 * Server-side session read for Server Components. Clerk is the source of
 * truth for identity, so this doesn't call the Pocketly API at all -- pages
 * that need the Pocketly *profile* (currency, timezone) fetch it separately
 * via `getServerApiClient`.
 */
export async function getServerSession(): Promise<{
  user: SessionUser;
} | null> {
  const user = await currentUser();
  if (!user) return null;

  const email =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    "";

  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    email.split("@")[0];

  return {
    user: {
      id: user.id,
      email,
      name,
      image: user.imageUrl,
    },
  };
}
