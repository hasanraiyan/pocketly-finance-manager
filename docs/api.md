# API

Base URL: `http://localhost:4000/api/v1` (dev). All routes require a Clerk session bearer token except `GET /health` and `POST /webhooks/clerk` (verified by Svix signature instead).

```
Authorization: Bearer <clerk-session-token>
```

Every success response is wrapped in `{ "data": ... }` (see `docs/architecture.md` § Response shape & pagination). Error responses keep Nest's default `{ statusCode, message, error }` shape, unwrapped. Every response also carries an `X-Request-Id` header.

Every list endpoint (`accounts`, `categories`, `transactions`, `budgets`) is cursor-paginated: pass `?limit=` (default 20, max 100) and `?cursor=` (from the previous page's `nextCursor`); the response is `{ "data": { "items": [...], "nextCursor": string | null } }`.

## Interactive docs

- Swagger UI: `GET /docs` — click "Authorize" and paste a Clerk session token; it persists across page reloads.
- Raw OpenAPI 3 spec: `GET /docs-json`.
- Postman collection: [`apps/api/postman/pocketly-api.postman_collection.json`](../apps/api/postman/pocketly-api.postman_collection.json), grouped into folders by tag (accounts, categories, transactions, budgets, analysis, health). Import it directly into Postman/Insomnia.

Both the OpenAPI JSON and the Postman collection are generated from the live app (so they can't drift from the actual routes/DTOs):

```bash
pnpm --filter api docs:generate
```

This writes `apps/api/openapi.json` and `apps/api/postman/pocketly-api.postman_collection.json`. Re-run it whenever routes or DTOs change and commit the result.

Every route declares its response schema (`@ApiOkResponse`/`@ApiCreatedResponse`/`@ApiNoContentResponse` in each controller, backed by Zod schemas in each domain's `dto/*-response.dto.ts`), not just its request body — otherwise `@pocketly/sdk`'s generated type for that route's response is `never`. `app.swagger.spec.ts` asserts this holds for every route as a regression test.

## Routes

| Resource | Routes |
| --- | --- |
| Health | `GET /health` (public; liveness + MongoDB readiness — 503 if the DB is unreachable) |
| Webhooks | `POST /webhooks/clerk` (public, Svix-signature verified; syncs `user.updated`/`user.deleted` from Clerk) |
| Users | `GET /users/me`, `PATCH /users/me` (update `currency`/`timezone` only), `DELETE /users/me` (requires `{ "confirm": true }` body — irreversible, deletes all financial data and the Clerk identity) |
| Accounts | `GET/POST /accounts` (paginated), `GET/PATCH/DELETE /accounts/:id` |
| Categories | `GET/POST /categories` (paginated), `GET/PATCH/DELETE /categories/:id` |
| Transactions | `GET/POST /transactions` (paginated; filters: `type`, `accountId`, `categoryId`, `from`, `to`, `q`), `GET/PATCH/DELETE /transactions/:id`, `PATCH /transactions/:id/restore` |
| Budgets | `GET/POST /budgets` (paginated), `GET/PATCH/DELETE /budgets/:id` |
| Analysis | `GET /analysis`, `GET /analysis/categories`, `GET /analysis/cash-flow`, `GET /analysis/accounts` (all accept `period`, and `from`/`to` when `period=custom`) |

See `docs/architecture.md` for how requests flow through auth → validation → service → database, and `docs/security.md` for the ownership/authorization model.
