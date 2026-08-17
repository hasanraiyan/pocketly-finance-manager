# Security

Status as of the current implementation — this is a living document, not a compliance claim. Update it when the underlying code changes.

## Implemented

**Authentication** — Pocketly is its own identity provider: `apps/api/src/auth/`. Passwords are hashed with Argon2id (`@node-rs/argon2`, m=65536/t=3/p=4) via `PasswordService`, never stored or logged in plaintext. A login/register issues a short-lived (15 min) RS256 access token plus a long-lived (30 day) opaque refresh token; the refresh token is stored hashed (SHA-256, `TokenService`) and rotated on every use — the old row is marked `revokedAt`, a new one issued — so a stolen refresh token that's already been used again is a detectable replay, not a silent compromise.

**Signing key persistence** — `JwtKeysService` generates one RS256 keypair lazily on first boot and persists it in MongoDB (`SigningKey`, singleton doc, atomic `findOneAndUpdate(..., { upsert: true })` so concurrent instances converge on the same key instead of racing). Every process reads the same keypair from Mongo afterward, so a restart or a second instance never invalidates outstanding tokens — the two bugs this replaced (`docs/clerk-migration-plan.md` §1: a fresh keypair generated per-boot, and a hardcoded `JWT_SECRET` fallback) can't recur because there's no per-process key and nothing to fall back to.

**Token audience pinning** — session tokens carry `iss: "pocketly"` / `aud: "pocketly-api"`; MCP access tokens carry `aud: "<API_BASE_URL>/mcp"`. `JwtAuthGuard` and `McpAuthGuard` each verify against their own audience via the same `JwtKeysService`, so a session token can't be replayed at `/mcp` and an MCP token can't be replayed at the REST API — enforced by signature verification, not just convention (covered by `mcp-auth.guard.spec.ts`'s audience-isolation case and `oauth-flow.e2e-spec.ts`).

**MCP access** — the API is its own OAuth 2.1 authorization server for MCP clients (`apps/api/src/mcp/oauth/`): Dynamic Client Registration (`POST /oauth2/register`), PKCE-only authorization-code flow (`GET /oauth2/authorize` → `/mcp-connect` consent page → `POST /oauth2/consent` → `POST /oauth2/token`), and its own JWKS (`GET /oauth2/jwks`). `McpAuthGuard` verifies each token against the `/mcp` audience — a session token is not accepted at `/mcp`, and an MCP token is not accepted at the REST API. Disconnecting an app deletes its `OAuthConsent` row (so it can't silently re-issue a code) and writes a revocation marker keyed by `userId`+`clientId`, checked against the token's `createdAt`/`iat` so revocation is immediate rather than "whenever the token expires".

**MCP scopes** — unlike the previous Clerk-hosted authorization server (fixed scope set, no custom scopes), Pocketly's own AS issues real `pocketly:read`/`pocketly:write` scopes (`DEFAULT_MCP_SCOPES` in `oauth.service.ts`), and the per-tool `requireScope` checks in `mcp-auth.guard.ts` enforce them. A client that only ever requests `pocketly:read` gets read-only access; the consent screen still grants scopes wholesale rather than letting a user deselect individual ones at consent time.

**Dynamic client registration** — `POST /oauth2/register` is intentionally `@Public()` (unauthenticated) per RFC 7591, so any MCP client can self-register a `client_id`. The consent screen (which names the requesting app) and the connection list in Settings are what stand between a registered client and a user's data, not the registration step itself.

**Authorization** — every financial document (`Account`, `Category`, `Transaction`, `Budget`) has a `userId`. `JwtAuthGuard` is global (`APP_GUARD`); every route requires a valid Pocketly-issued access token unless explicitly marked `@Public()`. Every service method fetches/writes by `{ _id, userId }` together — never `_id` alone — so one user's request can never see or mutate another user's row. This is covered by an integration test (`transactions.integration.spec.ts`) that explicitly asserts a second user is rejected.

**Input validation** — every request body/query is validated by a Zod schema (`nestjs-zod`, global `ZodValidationPipe`) before it reaches any service or database code. Invalid requests are rejected with 400 before touching business logic.

**Search input** — the transaction free-text search (`q`) is regex-escaped (`common/validation/escape-regexp.ts`) before being used in a MongoDB `$regex` filter, preventing regex-injection / ReDoS via crafted search strings.

**Soft deletion** — `Transaction`, `Account`, `Category`, `Budget` use `deletedAt` rather than hard deletes; normal queries exclude deleted rows.

**Secrets** — `apps/api/.env` is git-ignored; only `.env.example` (with blank values) is committed. `MONGODB_URI` is read via `@nestjs/config`, never hardcoded; there's no long-lived JWT secret to manage at all — the RS256 signing key is generated once and persisted in MongoDB (see "Signing key persistence" above).

**Category deletion guard** — a category in use by an existing transaction or budget can't be hard-deleted (only archived via `ignored`), preventing orphaned references.

**CORS** — `app.enableCors(...)` in `main.ts`, restricted to an explicit allow-list read from `CORS_ORIGINS` (comma-separated, defaults to `http://localhost:3000`). Not a wildcard.

**Rate limiting** — `@nestjs/throttler` applied globally (`APP_GUARD`): 100 requests/minute per client by default (`ThrottlerModule.forRoot` in `app.module.ts`). Per-route overrides (`@Throttle()`/`@SkipThrottle()`) can be added once AI/export endpoints exist and need tighter limits (SRS §62).

**Error monitoring** — `@sentry/nestjs` (SRS §67). `src/instrument.ts` is imported first in `main.ts` (required for auto-instrumentation), `SentryModule.forRoot()` + `SentryGlobalFilter` are wired in `app.module.ts`. `sendDefaultPii: false` — financial data must never leave the app as telemetry. Only unexpected/unhandled errors are reported; ordinary `HttpException`s (404, 400, etc.) are not. No-ops safely if `SENTRY_DSN` is unset.

**Account deletion** — `DELETE /users/me` (SRS §64), requires `{ "confirm": true }` in the body as a safeguard against accidental calls. Irreversible: hard-deletes every `Account`/`Category`/`Transaction`/`Budget` and every `RefreshToken` row owned by the user, then deletes the Pocketly `User` profile itself — no external identity provider to clean up. Covered by `users/users.service.spec.ts`, which asserts every collection is empty afterward.

**Request logging** — `LoggingInterceptor` (global, `APP_INTERCEPTOR`, `common/logging/logging.interceptor.ts`) logs every request: method, path, status, duration, request id, and the authenticated user's Mongo `_id` if present. This exists because expected errors (404/400/409/...) previously left **zero** trace anywhere — Sentry only reports genuinely unexpected errors by design, so a wave of validation failures or not-found responses was otherwise invisible. Log level scales with status: `log` for 2xx/3xx, `warn` for 4xx (includes the error message), `error` for 5xx (includes the stack trace). Deliberately logs only method + path — never the body, query string, or headers — so financial data and session/refresh tokens can never end up in logs.

**Request correlation** — `requestIdMiddleware` (`common/logging/request-id.middleware.ts`) runs first, before the auth guard, so every response (even a 401) carries an `X-Request-Id` header — reuses an incoming one if the caller sent it, generates one via `crypto.randomUUID()` otherwise. Included in every log line by `LoggingInterceptor`, so a user-reported issue can be traced back to its exact log entries.

**Response envelope** — `TransformInterceptor` (global, `APP_INTERCEPTOR`) wraps every success response in `{ data: ... }`, consistently across every route. Doesn't touch the error path (Nest's default `{ statusCode, message, error }` shape is unchanged), a 204's empty body, or routes marked `@RawResponse()` (the RFC-shaped OAuth endpoints, which a spec-compliant client needs unwrapped).

**Readiness check** — `GET /health` checks live MongoDB connection state (`mongoose.Connection.readyState`), not just process liveness, and returns 503 if the database is unreachable — so a load balancer/orchestrator can tell "the process is up" apart from "the process can actually serve requests."

## Not yet implemented (known gaps)

These are called out explicitly so they don't get assumed as "done":

- **HTTPS** is a deployment-time concern (reverse proxy / hosting platform), not application code — not configured here.
- **Automated backups / retention policy** (SRS §66) is an infrastructure concern for whichever MongoDB hosting is chosen — not addressed by application code.
- Rate limiting is a single global bucket for now — no per-route tiers yet (there's nothing to tier until AI/export/MCP endpoints exist).
- Logs go to stdout/stderr only (`Logger`'s default console transport) — no log aggregation/shipping configured. That's an infrastructure choice (which platform, which log sink) to make when deploying, not something to hardcode into the application now.

## Principles to keep following

- Every new resource is private by default (`JwtAuthGuard` applies unless explicitly `@Public()`), not the other way around.
- Never trust a client-supplied `userId` — always derive it from `@CurrentUser()`.
- Validate at the API boundary with Zod, not deep in service logic.
- Don't log financial amounts or session/refresh tokens in error output.
