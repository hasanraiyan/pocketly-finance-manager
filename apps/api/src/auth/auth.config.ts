import { MongoClient } from 'mongodb';
import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { bearer } from 'better-auth/plugins/bearer';
import { jwt } from 'better-auth/plugins';
import { oauthProvider } from '@better-auth/oauth-provider';
import { oauthProviderResourceClient } from '@better-auth/oauth-provider/resource-client';

const mongoUri =
  process.env.MONGODB_URI ?? 'mongodb://localhost:27017/pocketly';
const client = new MongoClient(mongoUri);
const db = client.db();

const trustedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const apiBaseURL = process.env.API_BASE_URL ?? 'http://localhost:4000';

/**
 * Canonical resource URI for the MCP tool endpoint (RFC 8707). Bound into
 * every access token as its `aud` claim, and published verbatim in the
 * `/.well-known/oauth-protected-resource` document -- see main.ts and
 * mcp-auth.guard.ts, which must both use this exact value.
 */
export const mcpResourceUri = `${apiBaseURL}/mcp`;

/**
 * Owns identity (email/password, sessions, multi-device revocation) in its
 * own MongoDB collections -- separate from the app-domain `User` Mongoose
 * model (name/currency/timezone), which is our own profile linked to
 * Better Auth's user id via `User.authUserId`. See AppAuthGuard for how the
 * two are stitched together on every request.
 *
 * `transaction: false` because a standalone (non-replica-set) MongoDB
 * instance -- the normal local dev setup -- doesn't support transactions.
 * Safe to enable once running against a real replica set / Atlas.
 */
export const auth = betterAuth({
  database: mongodbAdapter(db, { client, transaction: false }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: apiBaseURL,
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    // Better Auth requires this to return a Promise; there's no real async
    // work until a real email provider replaces the console.log below.
    // eslint-disable-next-line @typescript-eslint/require-await
    sendResetPassword: async ({ user, url }) => {
      // TODO: wire up a real email provider (Resend/SMTP) before launch.
      // Logging the link keeps the reset flow fully testable until then.
      console.log(`[auth] Password reset requested for ${user.email}: ${url}`);
    },
  },
  plugins: [
    bearer(),
    // Required by oauthProvider: MCP access tokens are signed JWTs,
    // verifiable locally via /jwks without a database round trip per call.
    jwt(),
    oauthProvider({
      loginPage: `${apiBaseURL}/mcp/login`,
      consentPage: `${apiBaseURL}/mcp/consent`,
      scopes: ['openid', 'profile', 'email', 'pocketly:read', 'pocketly:write'],
      // MCP clients (Claude, etc.) self-register without a pre-issued
      // developer credential -- this is how they actually connect in
      // practice (RFC 7591 dynamic client registration).
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      validAudiences: [mcpResourceUri],
      // Both path-aware well-known discovery routes are mounted manually
      // in main.ts (our issuer has a non-root path, /api/auth) -- this
      // just silences the plugin's init-time reminder to do that.
      silenceWarnings: { oauthAuthServerConfig: true, openidConfig: true },
    }),
  ],
});

/**
 * Shared resource-server actions for verifying MCP access tokens and
 * building protected-resource metadata -- one instance, reused by main.ts
 * (well-known routes) and McpAuthGuard (per-request token verification).
 */
export const mcpResourceClientActions =
  oauthProviderResourceClient(auth).getActions();
