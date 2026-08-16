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
- **Auth is injected, not hardcoded**: the package has no dependency on Clerk. `createPocketlyClient({ baseUrl, getToken })` accepts an async `getToken()` callback and injects `Authorization: Bearer <token>` via a middleware — `apps/web` will supply this from `@clerk/nextjs`, `apps/mobile` will eventually supply it from `@clerk/clerk-expo`. Same shape, different SDK, no coupling.
- **`baseUrl` must include `/api/v1`** — the generated spec's paths (`/health`, `/accounts`, ...) don't include the global prefix, since `apps/api/scripts/generate-docs.ts` generates the doc from a raw `TestingModule` app that never calls `setGlobalPrefix`.

`apps/web/src/lib/api-client.ts` is the current instantiation point (unauthenticated so far — Clerk isn't wired into `apps/web` yet).

## Backend (`apps/api`)

### Layering

```
HTTP request
    ↓
requestIdMiddleware     reads/generates X-Request-Id, sets it on the response, first of everything
    ↓
clerkMiddleware        parses the Clerk session token (Express middleware, every request)
    ↓
ThrottlerGuard         100 req/min per client (global)
    ↓
ClerkAuthGuard         resolves the Clerk session → Pocketly User, attaches req.user
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

Each domain (`accounts`, `categories`, `transactions`, `budgets`, `analysis`, `users`) is one Nest module: schema + Zod DTOs + service + controller. There is no separate repository layer on top of the injected Mongoose models — the service is the only thing that touches the model, which already satisfies the SRS's "isolate the database layer" requirement without an extra abstraction.

### Shared model registration

Every Mongoose schema is registered exactly once, in `common/database/database.module.ts` (marked `@Global()`). Domain modules do **not** call `MongooseModule.forFeature` themselves — they just inject the model via `@InjectModel`. This avoids duplicate model registration (a real Mongoose crash risk) and avoids circular module imports between domains that need each other's models (e.g. `AccountsService` needs the `Transaction` model to compute balances).

### Ownership enforcement

Every financial document has a `userId`. Every query filters and writes by `{ _id, userId }` together — a document is never fetched by `_id` alone. See `security.md`.

### Money & dates

- Amounts are stored as integer minor units (e.g. `10050` = ₹100.50), never floating point.
- Transaction/analysis date fields are validated as ISO 8601 strings (`common/validation/iso-date.schema.ts`) and transformed to `Date` at parse time — `z.coerce.date()` was tried first but can't be represented in JSON Schema, which broke OpenAPI generation.
- Budget periods and analysis ranges are resolved in the *user's own timezone* (`common/finance/get-period-window.ts`, `resolve-analysis-range.ts`) using `date-fns-tz`, then converted to UTC instants for Mongo queries.

### Auth

Clerk owns identity (`@clerk/express`: `clerkMiddleware()` + `getAuth()`). Pocketly owns authorization: `ClerkAuthGuard` is a global guard (`APP_GUARD`) that resolves the Clerk user to a Pocketly `User` document (creating one on first sight, via `UsersService.findOrCreateByClerkId`) and attaches it to the request. Routes are private by default; `@Public()` opts a route out (`GET /health`, `POST /webhooks/clerk`).

### Staying in sync with Clerk

Two paths keep the Pocketly `User` profile aligned with Clerk, for different situations:

- **Lazy, on first API call**: `UsersService.findOrCreateByClerkId` creates the Pocketly profile the first time a Clerk user hits any authenticated route. Fine for new users, but doesn't react to changes made *after* that.
- **Pushed, via webhook**: `POST /webhooks/clerk` (`src/webhooks/`) verifies the request came from Clerk using Svix signature verification (`@clerk/backend/webhooks`'s `verifyWebhook`, `CLERK_WEBHOOK_SIGNING_SECRET`), then handles two event types — `user.updated` syncs `email`/`name`/`imageUrl` (never `currency`/`timezone`, which are Pocketly-owned), `user.deleted` erases the user's financial data the same way `DELETE /users/me` does (`UsersService.eraseAllData`), just without the redundant call back to Clerk to delete an identity that's already gone. Both handlers no-op if the Clerk user isn't one we've ever seen — nothing to sync.

Signature verification needs the exact raw request bytes, so `main.ts` boots the app with `{ rawBody: true }` — Nest preserves `req.rawBody` (a `Buffer`) alongside the normally-parsed `req.body` for every request, and only the webhook handler reads it.

### Response shape & pagination

Every success response is wrapped in `{ data: ... }` by the global `TransformInterceptor` (`common/http/transform.interceptor.ts`) — consistent across every route, including `/health`. A 204 (no body) passes through untouched. Error responses are **not** wrapped; Nest's default `{ statusCode, message, error }` shape is unchanged.

Every list endpoint (`accounts`, `categories`, `transactions`, `budgets`) uses cursor pagination: `?cursor=&limit=` in, `{ items: [...], nextCursor: string | null }` out (then wrapped in the envelope, so the full body is `{ data: { items, nextCursor } }`). Two cursor implementations exist because they key on different fields:

- `common/pagination/id-cursor.ts` — keyed on `_id` alone. Used by accounts/categories/budgets, which have no independent sort field; MongoDB ObjectIds are monotonically increasing, so sorting/paginating by `_id` is equivalent to insertion order.
- `common/pagination/date-cursor.ts` — keyed on `(date, _id)`. Used only by transactions, which sort by a user-editable `date` field that doesn't correlate with insertion order.

`common/pagination/paginated-list.schema.ts` and `common/pagination/pagination-query.dto.ts` are the shared Zod builders both cursor styles' response/request schemas are built from. Analysis endpoints are intentionally **not** paginated — their arrays are bounded by the query range (days/categories/accounts), not open-ended growth.

### Request tracing

`requestIdMiddleware` (`common/logging/request-id.middleware.ts`) runs first, before Clerk — every response carries an `X-Request-Id` header (reusing an incoming one if the caller sent it), and `LoggingInterceptor` includes it in every log line, so a specific request can be traced through the logs even without a full log-aggregation setup.

### API docs

- Swagger UI: `GET /docs` (interactive, Clerk bearer-auth button, persisted across reloads).
- Raw OpenAPI JSON: `GET /docs-json`, or generate it to a file with `pnpm --filter api docs:generate` (also produces `apps/api/postman/pocketly-api.postman_collection.json`).
- DTOs are Zod schemas (`nestjs-zod`'s `createZodDto`) — they generate their own OpenAPI schema automatically, no duplicate `@ApiProperty()` decoration needed.

## Frontend (`apps/web`)

Next.js 16 (App Router), TypeScript, Tailwind. Not yet wired to the API or to Clerk — that's the next planned step.

## Testing

- Unit tests for pure calculation logic (balance, budget status, period-window resolution, cursor encode/decode, regex escaping) — no I/O.
- Integration tests boot a real Nest module graph against `mongodb-memory-server` (in-process MongoDB, no external service needed) to verify balance updates, budget status updates, and cross-user ownership enforcement end-to-end.
- A dedicated test boots the full `AppModule` and asserts the OpenAPI document generates correctly — this caught the `z.coerce.date()` issue above, and separately catches any route missing a declared response schema.
- `pnpm --filter api test` runs both: Jest unit/integration specs (`src/**/*.spec.ts`), then a real HTTP e2e test (`test/app.e2e-spec.ts`, supertest against a real booted app + `mongodb-memory-server`) that asserts the `{ data }` envelope and `X-Request-Id` header actually show up on the wire — not just in types. This test was previously broken and silently never run (wrong Jest config, not wired into CI); fixed and wired into the main `test` script specifically because it's the only test exercising the real interceptor/middleware chain over HTTP.
