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
ClerkAuthGuard        resolves the Clerk session → Pocketly User, attaches req.user
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

Clerk owns identity (`@clerk/express`: `clerkMiddleware()` + `getAuth()`). Pocketly owns authorization: `ClerkAuthGuard` is a global guard (`APP_GUARD`) that resolves the Clerk user to a Pocketly `User` document (creating one on first sight, via `UsersService.findOrCreateByClerkId`) and attaches it to the request. Routes are private by default; `@Public()` opts a route out (used only by `GET /health`).

### API docs

- Swagger UI: `GET /docs` (interactive, Clerk bearer-auth button, persisted across reloads).
- Raw OpenAPI JSON: `GET /docs-json`, or generate it to a file with `pnpm --filter api docs:generate` (also produces `apps/api/postman/pocketly-api.postman_collection.json`).
- DTOs are Zod schemas (`nestjs-zod`'s `createZodDto`) — they generate their own OpenAPI schema automatically, no duplicate `@ApiProperty()` decoration needed.

## Frontend (`apps/web`)

Next.js 16 (App Router), TypeScript, Tailwind. Not yet wired to the API or to Clerk — that's the next planned step.

## Testing

- Unit tests for pure calculation logic (balance, budget status, period-window resolution, cursor encode/decode, regex escaping) — no I/O.
- Integration tests boot a real Nest module graph against `mongodb-memory-server` (in-process MongoDB, no external service needed) to verify balance updates, budget status updates, and cross-user ownership enforcement end-to-end.
- A dedicated test boots the full `AppModule` and asserts the OpenAPI document generates correctly — this caught the `z.coerce.date()` issue above.
