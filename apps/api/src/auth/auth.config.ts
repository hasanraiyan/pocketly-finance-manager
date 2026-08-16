import { MongoClient } from 'mongodb';
import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { bearer } from 'better-auth/plugins/bearer';
import { jwt } from 'better-auth/plugins';
import { oauthProvider } from '@better-auth/oauth-provider';
import { oauthProviderResourceClient } from '@better-auth/oauth-provider/resource-client';
import { Resend } from 'resend';

export const apiBaseURL = process.env.API_BASE_URL ?? 'http://localhost:4000';
const webBaseURL = process.env.WEB_BASE_URL ?? 'http://localhost:3000';

const trustedOrigins = Array.from(
  new Set([
    ...(process.env.CORS_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    webBaseURL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]),
);

/**
 * Canonical resource URI for the MCP tool endpoint (RFC 8707). Bound into
 * every access token as its `aud` claim, and published verbatim in the
 * `/.well-known/oauth-protected-resource` document -- see main.ts and
 * mcp-auth.guard.ts, which must both use this exact value.
 */
export const mcpResourceUri = `${apiBaseURL}/mcp`;

/**
 * `oauthProviderResourceClient(auth)` derives default `jwksUrl`/`issuer`
 * values from the auth instance, and both come out wrong: `jwksUrl` omits
 * Better Auth's basePath entirely (confirmed: "Jwks failed: Cannot GET
 * /jwks"), and its `issuer` fallback is bare `baseURL` with no basePath
 * either -- but tokens are actually signed with `iss` = `baseURL+basePath`
 * (confirmed by decoding a real issued token), so relying on that fallback
 * fails every verification with a silent issuer mismatch ("invalid access
 * token"). Both are passed explicitly to every verifyAccessToken call
 * below instead.
 */
export const mcpJwksUrl = `${apiBaseURL}/api/auth/jwks`;
export const mcpIssuer = `${apiBaseURL}/api/auth`;

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
 *
 * Built lazily (see getAuth() below) rather than as a module-level const --
 * MONGODB_URI must be read at first real use, not at import time, so tests
 * can point this at an in-memory MongoDB before anything touches auth.
 */
function buildAuth() {
  const mongoUri =
    process.env.MONGODB_URI ?? 'mongodb://localhost:27017/pocketly';
  const client = new MongoClient(mongoUri);
  const db = client.db();

  return betterAuth({
    database: mongodbAdapter(db, { client, transaction: false }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: apiBaseURL,
    trustedOrigins,
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, url }) => {
        const apiKey = process.env.RESEND_API_KEY;
        const fromAddress =
          process.env.RESEND_FROM_EMAIL ?? 'Pocketly <onboarding@resend.dev>';

        if (!apiKey) {
          console.log(
            `[auth] RESEND_API_KEY is not set -- logging reset link for ${user.email}: ${url}`,
          );
          return;
        }

        try {
          const resend = new Resend(apiKey);
          const { error } = await resend.emails.send({
            from: fromAddress,
            to: user.email,
            subject: 'Reset your Pocketly password',
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
                <h1 style="font-size: 20px; margin: 0 0 12px;">Reset your Pocketly password</h1>
                <p style="font-size: 14px; color: #555; line-height: 1.5; margin: 0 0 24px;">
                  Click the button below to reset your password. This link will expire shortly.
                </p>
                <a href="${url}" style="display: inline-block; background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: 500;">
                  Reset Password
                </a>
                <p style="font-size: 12px; color: #999; margin: 32px 0 0;">
                  If you didn't request a password reset, you can safely ignore this email.
                </p>
              </div>
            `.trim(),
          });

          if (error) {
            console.error(
              `[auth] Failed to send password reset to ${user.email}:`,
              error,
            );
          } else {
            console.log(`[auth] Sent password reset email to ${user.email}`);
          }
        } catch (err) {
          console.error(
            `[auth] Error sending reset email to ${user.email}:`,
            err,
          );
        }
      },
    },
    user: {
      // Off by default in Better Auth -- without this, auth.api.deleteUser
      // (called by UsersController.deleteAccount, the Settings page's Danger
      // Zone / SRS §64) throws a NOT_FOUND that Nest can't map to a proper
      // HTTP status, surfacing as a bare 500. Our own UsersService.deleteAccount
      // already wipes financial data before this runs, so no beforeDelete
      // hook or email-verification step is needed here.
      deleteUser: { enabled: true },
    },
    plugins: [
      bearer(),
      // Required by oauthProvider: MCP access tokens are signed JWTs,
      // verifiable locally via /jwks without a database round trip per call.
      jwt(),
      oauthProvider({
        // Both pages live in apps/web (not here), matching the rest of the
        // sign-in flow -- see apps/web's sign-in page (MCP re-entry branch)
        // and app/mcp-connect. Web and api are same-site (same registrable
        // domain, different port/subdomain), so Better Auth's session cookie
        // set during login still reaches these cross-origin credentialed
        // requests -- see auth-client.ts's `credentials: "include"`.
        loginPage: `${webBaseURL}/sign-in`,
        consentPage: `${webBaseURL}/mcp-connect`,
        scopes: [
          'openid',
          'profile',
          'email',
          'pocketly:read',
          'pocketly:write',
        ],
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
}

let authInstance: ReturnType<typeof buildAuth> | undefined;

export function getAuth(): ReturnType<typeof buildAuth> {
  authInstance ??= buildAuth();
  return authInstance;
}

/**
 * Shared resource-server actions for verifying MCP access tokens and
 * building protected-resource metadata -- one instance, reused by main.ts
 * (well-known routes) and McpAuthGuard (per-request token verification).
 * Lazy for the same reason getAuth() is -- it wraps getAuth() internally.
 */
type McpResourceClientActions = ReturnType<
  ReturnType<typeof oauthProviderResourceClient>['getActions']
>;

let mcpResourceClientActionsInstance: McpResourceClientActions | undefined;

export function getMcpResourceClientActions(): McpResourceClientActions {
  mcpResourceClientActionsInstance ??=
    oauthProviderResourceClient(getAuth()).getActions();
  return mcpResourceClientActionsInstance;
}
