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

## Not yet implemented (known gaps)

These are called out explicitly so they don't get assumed as "done":

- **CORS** is not configured in `main.ts`. The web app (port 3000) calling the API (port 4000) cross-origin will be blocked until `app.enableCors(...)` is added with an explicit allowed-origins list.
- **Rate limiting** (SRS §62) — no throttling on auth-adjacent, AI, or export endpoints yet (AI/export aren't built yet either).
- **HTTPS** is a deployment-time concern (reverse proxy / hosting platform), not application code — not configured here.
- **Error monitoring** (Sentry, SRS §67) is not wired in. Errors currently only go to stdout/stderr.
- **Account deletion flow** (SRS §64) is not implemented.
- **Automated backups / retention policy** (SRS §66) is an infrastructure concern for whichever MongoDB hosting is chosen — not addressed by application code.

## Principles to keep following

- Every new resource is private by default (`ClerkAuthGuard` applies unless explicitly `@Public()`), not the other way around.
- Never trust a client-supplied `userId` — always derive it from `@CurrentUser()`.
- Validate at the API boundary with Zod, not deep in service logic.
- Don't log financial amounts or Clerk tokens in error output.
