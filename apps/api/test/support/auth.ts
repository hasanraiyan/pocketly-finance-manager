import { App } from 'supertest/types';

let counter = 0;

/**
 * Mints a bearer token for a fresh user. Clerk owns real identities, so
 * there is no sign-up endpoint to call any more: TestAuthGuard (wired in by
 * createTestApp) treats the token as a Clerk user id, and the profile is
 * created on first use by `UsersService.findOrCreateByClerkId` -- exactly
 * what happens in production the first time a Clerk user calls the API.
 */
export function signUpTestUser(
  _app: App,
  overrides: { clerkUserId?: string } = {},
): Promise<{ token: string; email: string }> {
  counter += 1;
  const clerkUserId =
    overrides.clerkUserId ?? `user_flowtest${Date.now()}${counter}`;

  return Promise.resolve({
    token: clerkUserId,
    email: `${clerkUserId}@example.test`,
  });
}
