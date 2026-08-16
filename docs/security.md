# Security

Status as of the current implementation — this is a living document, not a compliance claim. Update it when the underlying code changes.

## Implemented

**Authentication** — Clerk is the sole identity provider (`@clerk/express`). No custom password/session/OAuth code exists in this repo, and none should be added (SRS §7).

**Authorization** — every financial document (`Account`, `Category`, `Transaction`, `Budget`) has a `userId`. `ClerkAuthGuard` is global (`APP_GUARD`); every route requires a valid Clerk session unless explicitly marked `@Public()`. Every service method fetches/writes by `{ _id, userId }` together — never `_id` alone — so one user's request can never see or mutate another user's row. This is covered by an integration test (`transactions.integration.spec.ts`) that explicitly asserts a second user is rejected.

**Input validation** — every request body/query is validated by a Zod schema (`nestjs-zod`, global `ZodValidationPipe`) before it reaches any service or database code. Invalid requests are rejected with 400 before touching business logic.

**Search input** — the transaction free-text search (`q`) is regex-escaped (`common/validation/escape-regexp.ts`) before being used in a MongoDB `$regex` filter, preventing regex-injection / ReDoS via crafted search strings.

**Soft deletion** — `Transaction`, `Account`, `Category`, `Budget` use `deletedAt` rather than hard deletes; normal queries exclude deleted rows.

**Secrets** — `apps/api/.env` is git-ignored; only `.env.example` (with blank values) is committed. `MONGODB_URI` and `CLERK_SECRET_KEY` are read via `@nestjs/config`, never hardcoded.

**Category deletion guard** — a category in use by an existing transaction or budget can't be hard-deleted (only archived via `ignored`), preventing orphaned references.

**CORS** — `app.enableCors(...)` in `main.ts`, restricted to an explicit allow-list read from `CORS_ORIGINS` (comma-separated, defaults to `http://localhost:3000`). Not a wildcard.

**Rate limiting** — `@nestjs/throttler` applied globally (`APP_GUARD`): 100 requests/minute per client by default (`ThrottlerModule.forRoot` in `app.module.ts`). Per-route overrides (`@Throttle()`/`@SkipThrottle()`) can be added once AI/export endpoints exist and need tighter limits (SRS §62).

**Error monitoring** — `@sentry/nestjs` (SRS §67). `src/instrument.ts` is imported first in `main.ts` (required for auto-instrumentation), `SentryModule.forRoot()` + `SentryGlobalFilter` are wired in `app.module.ts`. `sendDefaultPii: false` — financial data must never leave the app as telemetry. Only unexpected/unhandled errors are reported; ordinary `HttpException`s (404, 400, etc.) are not. No-ops safely if `SENTRY_DSN` is unset.

**Account deletion** — `DELETE /users/me` (SRS §64), requires `{ "confirm": true }` in the body as a safeguard against accidental calls. Irreversible: hard-deletes every `Account`/`Category`/`Transaction`/`Budget` owned by the user, deletes the Pocketly `User` profile, then deletes the Clerk identity itself (`clerkClient.users.deleteUser`). Covered by `users/users.service.spec.ts`, which mocks the Clerk call and asserts every collection is empty afterward.

## Not yet implemented (known gaps)

These are called out explicitly so they don't get assumed as "done":

- **HTTPS** is a deployment-time concern (reverse proxy / hosting platform), not application code — not configured here.
- **Automated backups / retention policy** (SRS §66) is an infrastructure concern for whichever MongoDB hosting is chosen — not addressed by application code.
- Rate limiting is a single global bucket for now — no per-route tiers yet (there's nothing to tier until AI/export/MCP endpoints exist).

## Principles to keep following

- Every new resource is private by default (`ClerkAuthGuard` applies unless explicitly `@Public()`), not the other way around.
- Never trust a client-supplied `userId` — always derive it from `@CurrentUser()`.
- Validate at the API boundary with Zod, not deep in service logic.
- Don't log financial amounts or Clerk tokens in error output.
