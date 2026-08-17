# Architecture

## Monorepo layout

```
pocketly/
├── apps/
│   ├── web/   Next.js frontend (port 3000)
│   └── api/   NestJS backend  (port 4000)
├── packages/
│   └── sdk/   @pocketly/sdk — shared typed API client (see below)
├── docs/      this folder
└── requirement.md   product SRS
```

pnpm workspaces + Turborepo. `apps/mobile` (Expo) is planned but not started — see `requirement.md` §44.

## Shared API client (`packages/sdk`)

`@pocketly/sdk` is a typed HTTP client generated from `apps/api/openapi.json` — the same spec `apps/api`'s Zod DTOs already produce (see below). It exists so `apps/web` and (eventually) `apps/mobile` share one client instead of each hand-writing/duplicating request and response types.

- **Codegen, not hand-written types**: `openapi-typescript` turns the OpenAPI spec into `paths`/`components` types (`pnpm --filter @pocketly/sdk generate`, committed output in `src/generated/schema.d.ts`). Regenerate it whenever `apps/api/openapi.json` changes.
- **Runtime**: `openapi-fetch` — tiny, zero-dependency, built on the global `fetch`. Works unmodified in the browser, Node, and React Native/Expo, which is exactly what "web now, mobile later" needs.
- **Auth is injected, not hardcoded**: the package has no dependency on any identity provider. `createPocketlyClient({ baseUrl, getToken })` accepts an async `getToken()` callback and injects `Authorization: Bearer <token>` via a middleware — `apps/web`'s `AuthProvider` (`lib/auth-provider.tsx`) supplies this, refreshing the access token first if it's expired. Same shape works for `apps/mobile` later.
- **`baseUrl` must include `/api/v1`** — the generated spec's paths (`/health`, `/accounts`, ...) don't include the global prefix, since `apps/api/scripts/generate-docs.ts` generates the doc from a raw `TestingModule` app that never calls `setGlobalPrefix`.

`apps/web/src/lib/use-pocketly-client.ts` (client components) and `lib/api-client.ts#getServerApiClient` (Server Components) are the instantiation points.

## Backend (`apps/api`)

### Layering

```
HTTP request
    ↓
requestIdMiddleware     reads/generates X-Request-Id, sets it on the response, first of everything
    ↓
ThrottlerGuard         100 req/min per client (global)
    ↓
JwtAuthGuard           verifies the Pocketly-issued access token (RS256, via JwtKeysService), attaches req.user
    ↓
LoggingInterceptor      records start time; after the response/error, logs method+path+status+duration+requestId+userId
    ↓
ZodValidationPipe      validates the request body/query against a Zod schema (global)
    ↓
Controller             thin: pulls @CurrentUser(), delegates to a service
    ↓
Service                 domain logic: ownership checks, balance/budget calculations
    ↓
Mongoose Model          schema-level validation, indexes
    ↓
MongoDB
    ↓
TransformInterceptor    wraps the success response in { data: ... } on the way back out
```

Each domain (`accounts`, `categories`, `transactions`, `budgets`, `goals`, `money-rules`, `analysis`, `users`) is one Nest module: schema + Zod DTOs + service + controller. There is no separate repository layer on top of the injected Mongoose models — the service is the only thing that touches the model, which already satisfies the SRS's "isolate the database layer" requirement without an extra abstraction.

### Analysis vs intelligence

Two modules, split along a line worth keeping: **`analysis` reports what happened, `intelligence` projects what will.**

`intelligence` holds one loader, `FinancialContextService`, which gathers balances, active recurrence rules, budgets, goals, monthly history and a discretionary run-rate in a single pass. Everything else in the module — `ForecastService`, `SafeToSpendService`, `HealthScoreService`, `ScenarioService` — is a thin wrapper around a *pure* calculator in `common/finance/` operating on that context. No service in the module issues its own query.

That constraint is the point. It makes every projected number unit-testable with no I/O (`forecast-balance.spec.ts`, `safe-to-spend.spec.ts`, `health-score.spec.ts`, `simulate-scenario.spec.ts`), and it is what stops the dashboard, the MCP tools and the money-rule worker from each growing their own slightly different arithmetic. `InsightsService` reads the same context, which is how an insight can talk about a forecast shortfall or a goal slipping without duplicating either calculation.

The scenario simulator is the clearest case: it runs the same forecast twice — once on the context, once on a modified copy — and diffs them. A what-if that contradicts the what-is would be worse than no what-if at all.

### Shared model registration

Every Mongoose schema is registered exactly once, in `common/database/database.module.ts` (marked `@Global()`). Domain modules do **not** call `MongooseModule.forFeature` themselves — they just inject the model via `@InjectModel`. This avoids duplicate model registration (a real Mongoose crash risk) and avoids circular module imports between domains that need each other's models (e.g. `AccountsService` needs the `Transaction` model to compute balances).

### Ownership enforcement

Every financial document has a `userId`. Every query filters and writes by `{ _id, userId }` together — a document is never fetched by `_id` alone. See `security.md`.

### Money & dates

- Amounts are stored as integer minor units (e.g. `10050` = ₹100.50), never floating point.
- Transaction/analysis date fields are validated as ISO 8601 strings (`common/validation/iso-date.schema.ts`) and transformed to `Date` at parse time — `z.coerce.date()` was tried first but can't be represented in JSON Schema, which broke OpenAPI generation.
- Budget periods and analysis ranges are resolved in the *user's own timezone* (`common/finance/get-period-window.ts`, `resolve-analysis-range.ts`) using `date-fns-tz`, then converted to UTC instants for Mongo queries.

### Auth

Pocketly is its own identity provider (`apps/api/src/auth/`) — no external provider, no webhook sync to keep in step. Pieces:

- **`PasswordService`** — Argon2id hashing (`@node-rs/argon2`) for `User.passwordHash`.
- **`JwtKeysService`** — the RS256 signing/verification service. Generates one keypair lazily on first boot, persists it in MongoDB (`SigningKey` singleton, `findOneAndUpdate(..., { upsert: true })` so concurrent instances converge on one key), and every process reads that same key afterward. Signs both regular session tokens and MCP OAuth tokens — one signing mechanism, one JWKS.
- **`TokenService`** — opaque refresh-token generation/hashing (SHA-256) and timing-safe comparison.
- **`AuthService`** — `register`/`login`/`refresh`/`logout`, session listing/revocation, password change. `refresh` rotates: the presented `RefreshToken` row is marked `revokedAt`, a new one is issued. Access tokens carry an `sid` claim pointing back at the `RefreshToken` row they descend from, which is how `GET /auth/sessions` marks "this device" without needing the refresh token itself on every request.
- **`JwtAuthGuard`** — global guard (`APP_GUARD`) that verifies the access token (issuer `pocketly`, audience `pocketly-api`) and resolves `req.user` from its `sub` claim via `UsersService.findById`. Routes are private by default; `@Public()` opts a route out (`GET /health`, `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, the `/oauth2/*` endpoints MCP clients call directly).

`RefreshToken` documents are Pocketly's own session bookkeeping — one row per device/browser, TTL-indexed so an expired-and-never-used row cleans itself up, and what backs the "Active Sessions & Devices" list in Settings.

### Response shape & pagination

Every success response is wrapped in `{ data: ... }` by the global `TransformInterceptor` (`common/http/transform.interceptor.ts`) — consistent across every route, including `/health`. A 204 (no body) passes through untouched. Error responses are **not** wrapped; Nest's default `{ statusCode, message, error }` shape is unchanged.

Every list endpoint (`accounts`, `categories`, `transactions`, `budgets`) uses cursor pagination: `?cursor=&limit=` in, `{ items: [...], nextCursor: string | null }` out (then wrapped in the envelope, so the full body is `{ data: { items, nextCursor } }`). Two cursor implementations exist because they key on different fields:

- `common/pagination/id-cursor.ts` — keyed on `_id` alone. Used by accounts/categories/budgets, which have no independent sort field; MongoDB ObjectIds are monotonically increasing, so sorting/paginating by `_id` is equivalent to insertion order.
- `common/pagination/date-cursor.ts` — keyed on `(date, _id)`. Used only by transactions, which sort by a user-editable `date` field that doesn't correlate with insertion order.

`common/pagination/paginated-list.schema.ts` and `common/pagination/pagination-query.dto.ts` are the shared Zod builders both cursor styles' response/request schemas are built from. Analysis endpoints are intentionally **not** paginated — their arrays are bounded by the query range (days/categories/accounts), not open-ended growth.

### Request tracing

`requestIdMiddleware` (`common/logging/request-id.middleware.ts`) runs first, before the auth guard — every response carries an `X-Request-Id` header (reusing an incoming one if the caller sent it), and `LoggingInterceptor` includes it in every log line, so a specific request can be traced through the logs even without a full log-aggregation setup.

### API docs

- Swagger UI: `GET /docs` (interactive, bearer-auth button that takes a Pocketly access token, persisted across reloads).
- Raw OpenAPI JSON: `GET /docs-json`, or generate it to a file with `pnpm --filter api docs:generate` (also produces `apps/api/postman/pocketly-api.postman_collection.json`).
- DTOs are Zod schemas (`nestjs-zod`'s `createZodDto`) — they generate their own OpenAPI schema automatically, no duplicate `@ApiProperty()` decoration needed.

## Frontend (`apps/web`)

Next.js 16 (App Router), TypeScript, Tailwind, wired to the API directly — no external identity provider.

- **`AuthProvider`** (`lib/auth-provider.tsx`, wraps the app in `layout.tsx`) holds the access token in memory and mirrors it into a short-lived, non-httpOnly cookie so Server Components can read it too (`lib/auth-tokens.ts`); the refresh token lives in `localStorage`, used only by the client-side `refresh()` call. Concurrent `getToken()` calls share one in-flight refresh (refresh tokens rotate on use, so two simultaneous refreshes would otherwise race each other).
- `src/proxy.ts` (Next 16's rename of `middleware.ts`) decode-checks the access-token cookie (presence + expiry, no signature verification at the edge) and redirects to `/sign-in?redirect=<path>` for the protected route prefixes; real verification happens per-request on the API.
- `/sign-in` and `/sign-up` are hand-built pages (`features/auth/sign-in-form.tsx`/`sign-up-form.tsx`) posting to `/auth/login`/`/auth/register` — no external hosted auth UI.
- API calls go through `@pocketly/sdk`: `lib/use-pocketly-client.ts` (client components) feeds it `AuthProvider`'s `getToken`, `lib/api-client.ts#getServerApiClient` reads the access-token cookie via `next/headers` for Server Components (no refresh capability needed there — the token is short-lived, and a stale one just means the client-side layer refreshes on the next interaction).
- `lib/get-session.ts#getServerSession` does a local decode-only read of the access-token cookie for the marketing pages, which only need to decide between "Dashboard" and "Sign in".

## MCP + OAuth

The API is its own OAuth 2.1 authorization server for MCP clients (`apps/api/src/mcp/oauth/`), not just a protected resource. An MCP client hits `POST /mcp` unauthenticated, gets a 401 carrying `WWW-Authenticate: Bearer resource_metadata="..."`, reads `/.well-known/oauth-protected-resource/mcp` (`mcp/well-known.controller.ts`), and runs the whole flow against Pocketly's own endpoints:

- `POST /oauth2/register` — Dynamic Client Registration (RFC 7591), `@Public()`.
- `GET /oauth2/authorize` — a plain browser navigation from the MCP client, so it can only carry cookies, not a custom header. Reads the web app's access-token cookie; redirects to `/sign-in` if absent/invalid, otherwise to `apps/web`'s `/mcp-connect` consent page with the request's client/PKCE/scope params in the query string.
- `POST /oauth2/consent` — called by `/mcp-connect` itself (an authenticated page in the web app, Bearer-token protected like any other API route), not by the MCP client. Issues a single-use, PKCE-bound authorization code and returns the URL to redirect the browser to (the *MCP client's* `redirect_uri`, not a Pocketly route).
- `POST /oauth2/token` — exchanges the code for an access token after verifying the PKCE code verifier.
- `GET /oauth2/jwks` — the same `JwtKeysService` keypair session tokens use, exposed for MCP clients to verify tokens themselves if they choose to.

`register`, `authorize`, `token`, and `jwks` are `@ApiExcludeEndpoint()`'d and `@RawResponse()`'d — they're RFC-shaped endpoints for MCP clients, not typed Pocketly API consumers, and a generic OAuth client can't parse Pocketly's usual `{ data: ... }` envelope. `consent` is the one endpoint in the controller meant for `@pocketly/sdk` consumption, so it's fully documented/typed instead.

`McpAuthGuard` verifies the resulting access token against the `/mcp` audience (not the session audience — see `security.md`), resolves the Pocketly `User`, and records the client in `mcp_connections` (what Settings → Connections lists). Disconnecting deletes the `OAuthConsent` row and writes a marker to `mcp_revocations` keyed by `userId`+`clientId`, checked against the token's `iat` so revocation is immediate rather than "whenever the token expires".

## Testing

- Unit tests for pure calculation logic (balance, budget status, period-window resolution, cursor encode/decode, regex escaping) — no I/O.
- Integration tests boot a real Nest module graph against `mongodb-memory-server` (in-process MongoDB, no external service needed) to verify balance updates, budget status updates, and cross-user ownership enforcement end-to-end.
- A dedicated test boots the full `AppModule` and asserts the OpenAPI document generates correctly — this caught the `z.coerce.date()` issue above, and separately catches any route missing a declared response schema.
- `pnpm --filter api test` runs both: Jest unit/integration specs (`src/**/*.spec.ts`), then a real HTTP e2e test (`test/app.e2e-spec.ts`, supertest against a real booted app + `mongodb-memory-server`) that asserts the `{ data }` envelope and `X-Request-Id` header actually show up on the wire — not just in types. This test was previously broken and silently never run (wrong Jest config, not wired into CI); fixed and wired into the main `test` script specifically because it's the only test exercising the real interceptor/middleware chain over HTTP.
