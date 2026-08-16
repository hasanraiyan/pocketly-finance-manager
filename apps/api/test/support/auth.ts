import request from 'supertest';
import { App } from 'supertest/types';

let counter = 0;

/**
 * Signs up a fresh user through Better Auth's own endpoint (mounted by
 * createTestApp()) and returns a bearer token good for /api/v1 requests --
 * the bearer() plugin puts it on the `set-auth-token` response header (same
 * header apps/web's auth-client.ts reads).
 */
export async function signUpTestUser(
  app: App,
  overrides: { email?: string; password?: string; name?: string } = {},
): Promise<{ token: string; email: string }> {
  counter += 1;
  const email =
    overrides.email ?? `flow-test-${Date.now()}-${counter}@example.com`;
  const password = overrides.password ?? 'password123';
  const name = overrides.name ?? 'Flow Test User';

  const response = await request(app)
    .post('/api/auth/sign-up/email')
    .send({ email, password, name })
    .expect(200);

  const token = response.headers['set-auth-token'] as string | undefined;
  if (!token) {
    throw new Error(
      `sign-up did not return a set-auth-token header (got ${JSON.stringify(response.body)})`,
    );
  }

  return { token, email };
}
