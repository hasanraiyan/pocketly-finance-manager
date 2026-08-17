import request from 'supertest';
import { App } from 'supertest/types';

let counter = 0;

/**
 * Registers a fresh user through the real `/auth/register` endpoint and
 * returns an access token for it -- exercises the actual `JwtAuthGuard` +
 * `AuthService` path end to end, rather than a stand-in guard.
 */
export async function signUpTestUser(
  app: App,
  overrides: { email?: string } = {},
): Promise<{ token: string; email: string }> {
  counter += 1;
  const email =
    overrides.email ?? `flowtest${Date.now()}${counter}@example.test`;

  const response = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'flow-test-password-1', name: 'Flow Test User' })
    .expect(201);

  const body = response.body as { data: { accessToken: string } };
  return { token: body.data.accessToken, email };
}
