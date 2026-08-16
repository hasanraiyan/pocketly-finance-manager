# Pocketly

Personal finance app. Monorepo managed with pnpm workspaces + Turborepo.

## Structure

```
pocketly/
├── apps/
│   ├── web/   # Next.js frontend (port 3000)
│   └── api/   # NestJS backend  (port 4000)
├── docs/      # architecture, security, API reference
├── requirement.md
└── turbo.json
```

Mobile (Expo/React Native) will be added later as `apps/mobile`. Not part of this phase.

## Setup

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # then fill in the values below
pnpm dev                                 # runs web + api together
```

### Environment variables (`apps/api/.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | no (defaults to 4000) | API listen port |
| `MONGODB_URI` | yes | MongoDB connection string |
| `CLERK_SECRET_KEY` | yes | Clerk backend secret key, used to verify session tokens |
| `CLERK_PUBLISHABLE_KEY` | yes | Clerk publishable key |

Without `MONGODB_URI` and `CLERK_SECRET_KEY` set, the API will fail to start (by design — see `docs/security.md`).

## Commands

Run from the repo root:

```
pnpm install       # install all workspace deps
pnpm dev           # run web + api together
pnpm build         # build all apps
pnpm typecheck     # typecheck all apps
pnpm lint          # lint all apps
pnpm test          # test all apps
```

Run a single app: `pnpm --filter web dev` or `pnpm --filter api dev`.

Regenerate API docs (OpenAPI JSON + Postman collection) after changing routes/DTOs:

```
pnpm --filter api docs:generate
```

## Notes

- `apps/web` runs on `next dev`, default port 3000.
- `apps/api` default port is 4000 (set via `PORT` env var), to avoid clashing with the web app.
- `apps/api` serves interactive API docs (Swagger UI) at `/docs`, and the raw OpenAPI JSON at `/docs-json`. A generated Postman collection lives at `apps/api/postman/pocketly-api.postman_collection.json`.
- See `docs/architecture.md` for how the backend is structured, `docs/security.md` for the auth/authorization model, and `docs/api.md` for the route reference.
- See `requirement.md` for the full product SRS.
