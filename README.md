# Pocketly

Personal finance app. Monorepo managed with pnpm workspaces + Turborepo.

## Structure

```
pocketly/
├── apps/
│   ├── web/   # Next.js frontend (port 3000)
│   └── api/   # NestJS backend  (port 4000)
├── requirement.md
└── turbo.json
```

Mobile (Expo/React Native) will be added later as `apps/mobile`. Not part of this phase.

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

## Notes

- `apps/web` runs on `next dev`, default port 3000.
- `apps/api` default port is 4000 (set via `PORT` env var), to avoid clashing with the web app.
- See `requirement.md` for the product SRS.
