# API

Base URL: `http://localhost:4000/api/v1` (dev). All routes require a Clerk session bearer token except `GET /health`.

```
Authorization: Bearer <clerk-session-token>
```

## Interactive docs

- Swagger UI: `GET /docs` — click "Authorize" and paste a Clerk session token; it persists across page reloads.
- Raw OpenAPI 3 spec: `GET /docs-json`.
- Postman collection: [`apps/api/postman/pocketly-api.postman_collection.json`](../apps/api/postman/pocketly-api.postman_collection.json), grouped into folders by tag (accounts, categories, transactions, budgets, analysis, health). Import it directly into Postman/Insomnia.

Both the OpenAPI JSON and the Postman collection are generated from the live app (so they can't drift from the actual routes/DTOs):

```bash
pnpm --filter api docs:generate
```

This writes `apps/api/openapi.json` and `apps/api/postman/pocketly-api.postman_collection.json`. Re-run it whenever routes or DTOs change and commit the result.

## Routes

| Resource | Routes |
| --- | --- |
| Health | `GET /health` (public) |
| Users | `GET /users/me`, `DELETE /users/me` (requires `{ "confirm": true }` body — irreversible, deletes all financial data and the Clerk identity) |
| Accounts | `GET/POST /accounts`, `GET/PATCH/DELETE /accounts/:id` |
| Categories | `GET/POST /categories`, `GET/PATCH/DELETE /categories/:id` |
| Transactions | `GET/POST /transactions` (filters: `type`, `accountId`, `categoryId`, `from`, `to`, `q`; cursor pagination via `cursor`/`limit`), `GET/PATCH/DELETE /transactions/:id`, `PATCH /transactions/:id/restore` |
| Budgets | `GET/POST /budgets`, `GET/PATCH/DELETE /budgets/:id` |
| Analysis | `GET /analysis`, `GET /analysis/categories`, `GET /analysis/cash-flow`, `GET /analysis/accounts` (all accept `period`, and `from`/`to` when `period=custom`) |

See `docs/architecture.md` for how requests flow through auth → validation → service → database, and `docs/security.md` for the ownership/authorization model.
