# Clerk Migration Plan

> **Superseded.** Clerk has since been removed from `apps/api` and `apps/web` in favor of a
> custom NestJS + JWT auth system (Argon2id passwords, RS256 access/refresh tokens, a
> self-hosted OAuth 2.1 authorization server for MCP) — see `docs/security.md` and
> `docs/architecture.md` for the current design. The two bugs documented in §1 below
> (per-boot key regeneration, hardcoded `JWT_SECRET` fallback) are exactly what the new
> `JwtKeysService`'s persisted-keypair design fixes. Kept here as history, not as current
> state. **`apps/mobile` still authenticates via `@clerk/expo` and has not been migrated** —
> since the API no longer accepts Clerk-issued tokens, the mobile app cannot currently reach
> the API until it's migrated too.

Replace the hand-rolled auth system (email/password + sessions + Google OAuth + a
home-grown OAuth 2.1 authorization server for MCP) with Clerk:

- **API (NestJS)** → `@clerk/express` (`clerkMiddleware()` + `getAuth()`), `@clerk/backend` for the Backend API.
- **Web (Next.js 16, App Router)** → `@clerk/nextjs` (`ClerkProvider`, `clerkMiddleware`, prebuilt `<SignIn/>`/`<SignUp/>`/`<UserProfile/>`).
- **Mobile (Expo)** → already on `@clerk/expo`; only needs to point at the same Clerk instance.
- **Google sign-in** → Clerk social connection, not our own Google OAuth code.
- **MCP OAuth** → Clerk OAuth Applications as the authorization server (with Dynamic Client Registration); the API keeps only the *protected-resource* half.

Status: **code landed for Phases 1–4 and 6; Phase 0 (Clerk dashboard) and Phase 5 (running the user import) are yours to do.** See §14 for what changed versus this plan and what is left.

---

## 1. Where we are today

### API (`apps/api`)

| Concern | Today |
|---|---|
| Identity store | `auth_users` collection (`auth/schemas/auth-user.schema.ts`) — email, argon2id `passwordHash`, `googleId`, `emailVerified`, `role`, `banned` |
| Sessions | `AuthSession` + `AuthToken` schemas, 30-day HS256 JWT signed by `@nestjs/jwt` with `JWT_SECRET` (default hardcoded fallback in `auth.module.ts:34`) |
| Password hashing | `auth/password.service.ts` — `@node-rs/argon2`, m=65536, t=3, p=4 (PHC-string output) |
| Email flows | verify-email, forgot/reset password, change password via `auth.service.ts` + Resend |
| Google login | `auth/oauth/google.service.ts` + `GET /api/auth/google`, `GET /api/auth/callback/google` |
| Session mgmt | `GET /api/auth/sessions`, `POST sessions/revoke`, `sessions/revoke-others` |
| App guard | `common/auth/app-auth.guard.ts` as global `APP_GUARD`, resolves token → `AuthUser` → `User` via `findOrCreateByAuthUserId` |
| **MCP authorization server** | `auth/oauth/oauth.controller.ts` + `oauth.service.ts`: DCR (`oauth2/register`), `authorize`, `consent`, `token`, `jwks`, consent CRUD; `OAuthClient`/`OAuthCode`/`OAuthConsent` schemas |
| MCP token signing | `auth/oauth/jwt.service.ts` — RS256 keypair **generated in `onModuleInit()`** |
| MCP metadata | `auth/oauth/well-known.controller.ts` — AS metadata, OIDC config, protected-resource metadata |
| MCP guard | `mcp/mcp-auth.guard.ts` — verifies our RS256 token, checks `mcp_revocations` deny-list, resolves `User` |
| Scope enforcement | `mcp/mcp-context.ts#requireScope` — `decodeJwt` and check `pocketly:read` / `pocketly:write` |

### Web (`apps/web`)

- `lib/auth-client.ts` (301 lines) — hand-written Better-Auth-shaped client wrapping our endpoints.
- `lib/auth-token.ts`, `lib/get-session.ts` (server-side session fetch), `lib/api-client.ts`, `lib/use-pocketly-client.ts`.
- Pages: `sign-in`, `sign-up`, `forgot-password`, `reset-password`, `verify-email`, `auth/callback`, `mcp-connect` (our OAuth consent screen).
- `(app)/layout.tsx` — server-side `getServerSession()` + `redirect("/sign-in")`. **No `middleware.ts` exists.**
- Settings: `features/settings/security-hooks.ts` (sessions/password), `connections-hooks.ts` (MCP consents + revocation).

### Mobile (`apps/mobile`)

Already fully Clerk: `ClerkProvider` + `tokenCache` in `app/_layout.tsx`, `useSignIn`/`useAuth`/`useUser`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, and `src/lib/api-client.ts` injecting `getToken()` into the SDK.

> ⚠️ **Existing bug this migration fixes:** mobile signs in with Clerk and sends Clerk session tokens, while the API only accepts our custom JWTs. Mobile authenticated calls cannot be working against the current API. Confirm before starting so we know what "working" means at cutover.

### Two more problems worth naming (they justify the move)

1. `jwt.service.ts` generates a fresh RSA keypair on every boot → **every MCP access token is invalidated on restart/redeploy, and breaks entirely with more than one API instance** (JWKS differs per process).
2. `auth.module.ts` falls back to a hardcoded `JWT_SECRET` literal if the env var is missing.

---

## 2. Target architecture

```
Browser (Next.js)                          Expo app
  @clerk/nextjs                              @clerk/expo
  ClerkProvider + clerkMiddleware            ClerkProvider + tokenCache
        │ getToken()                                │ getToken()
        └────────────► Bearer <clerk session token> ◄┘
                              │
                     NestJS (@clerk/express)
                     clerkMiddleware() (global, main.ts)
                     ClerkAuthGuard (APP_GUARD) → req.user = Pocketly User
                              │
MCP client (Claude, etc.) ────┤ Bearer <Clerk OAuth access token>
   discovers via /.well-known/oauth-protected-resource (ours)
   → authorization_servers: [https://clerk.<domain>]  (Clerk hosts authorize/token/register/jwks)
                     McpAuthGuard verifies the OAuth token with Clerk
```

Clerk owns: identity, passwords, email verification, password reset, sessions/devices,
Google connection, the OAuth authorization server, consent UI, and connected-app management.

Pocketly owns: the `User` profile document (`currency`, `timezone`, `phone`, `imageUrl` overrides) and all financial data + authorization by `userId`.

---

## 3. Decisions to lock before Phase 1

| # | Decision | Recommendation |
|---|---|---|
| D1 | One Clerk app/instance shared by web + mobile + API? | **Yes** — one instance, one user pool. Mobile already has an instance; reuse it if it's the intended production one, otherwise create fresh and update mobile's key. |
| D2 | Migrate existing users or start clean? | **Migrate.** Bulk import with `password_digest` + `password_hasher: "argon2id"` (Clerk supports argon2id, and `@node-rs/argon2` already emits the required PHC string). |
| D3 | User ID strategy | Import each user with `external_id = <old AuthUser._id>`, then run a one-off script rewriting `users.authUserId` to the Clerk `user_xxx` id, keeping the old value in a new `legacyAuthUserId` field. Avoids permanent dual-lookup logic. |
| D4 | Keep custom sign-in UI or use Clerk components? | Start with Clerk's `<SignIn/>`/`<SignUp/>`/`<UserProfile/>` (appearance-themed) — they delete ~800 lines of page + hook code, including sessions/devices and password change. Revisit custom UI later if branding demands it. |
| D5 | MCP scopes | Ideally keep `pocketly:read` / `pocketly:write` as custom scopes on the Clerk OAuth app. **Verify Clerk supports custom scopes on OAuth applications**; if not, fall back to a single all-or-nothing grant and simplify `requireScope`. |
| D6 | Keep the Settings → Connections list? | Yes, but re-sourced from Clerk. Verify which Backend API endpoint lists/revokes a user's OAuth grants; if none is usable, link out to Clerk's account portal instead. |
| D7 | Cutover style | Big-bang per environment (dev → prod) with a maintenance note. Running both auth systems in parallel is not worth the complexity at this size. |

---

## 4. Phase 0 — Clerk dashboard + environment prep

1. Confirm/create the Clerk application; note the dev and prod instances.
2. Enable **Email + password** and **Google** as sign-in options; enable email verification.
3. Google connection: dev instance can use Clerk's shared credentials; **production must use our own** — reuse the existing `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` and add Clerk's OAuth callback URL to the Google Cloud console.
4. Enable **account linking on verified email** so users who had both a password and a `googleId` land on one identity.
5. Create the **OAuth Application** for MCP (Dashboard → OAuth applications, or `npx clerk@latest api oauth_applications -d '<json>'`) with scopes `openid profile email` — custom scopes are not supported, see §14. Enable **Dynamic Client Registration**, which MCP clients that self-register (Claude) need. Note what that turns on: a public, unauthenticated registration endpoint that anyone can call; Clerk force-enables the consent screen alongside it. Add the redirect URI(s) your MCP client uses.
6. Configure a **webhook endpoint** → `POST {API_BASE_URL}/webhooks/clerk`, events `user.updated`, `user.deleted`. Save the signing secret.
7. Env vars to add:
   - `apps/api/.env(.example)`: `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, `CLERK_AUTHORIZED_PARTIES` (web + mobile origins).
   - `apps/web/.env(.example)`: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`, and sign-in/up fallback redirect URLs → `/dashboard`.
   - `apps/mobile/.env`: confirm `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` matches the chosen instance.
   - Remove later: `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (moves into the Clerk dashboard).

---

## 5. Phase 1 — API session auth on `@clerk/express`

1. `pnpm --filter api add @clerk/express` (and `@clerk/backend` if not transitively provided). Remove `@nestjs/jwt`, `@node-rs/argon2`; keep `jose` only if `mcp-context.ts` still needs `decodeJwt` after Phase 4 (it probably won't).
2. `main.ts`: `app.use(clerkMiddleware({ authorizedParties: [...] }))` after `requestIdMiddleware`. Add `{ rawBody: true }` to `NestFactory.create` for webhook signature verification. Drop `exposedHeaders: ['set-auth-token']` from CORS; keep `credentials: true` only if anything still needs cookies (with pure Bearer tokens it can go).
3. Replace `common/auth/app-auth.guard.ts` with `ClerkAuthGuard`:
   - `@Public()` short-circuit stays exactly as-is.
   - `const { userId, isAuthenticated } = getAuth(req)` → 401 when absent.
   - Resolve the Pocketly profile via `UsersService.findOrCreateByClerkId(userId, ...)` — fetch email/name/image from `clerkClient.users.getUser(userId)` only on the create path (avoid an API call per request; consider caching or reading them off the session-token claims).
   - Attach to `req.user` as today so `@CurrentUser()` and every service keep working unchanged.
4. `UsersService`: rename `findOrCreateByAuthUserId` → `findOrCreateByClerkId` (same `authUserId` column, now holding `user_xxx`). Keep the email-fallback matching that exists today — it's what makes the ID remap in Phase 5 forgiving.
5. Add `webhooks/` module: `POST /webhooks/clerk`, `@Public()`, Svix signature verification via `@clerk/backend/webhooks`'s `verifyWebhook`, handling:
   - `user.updated` → sync `email` / `name` / `imageUrl` (never `currency`/`timezone`).
   - `user.deleted` → `UsersService.eraseAllData`.
   Exclude `webhooks/(.*)` from the `api/v1` global prefix in `main.ts`.
6. `DELETE /users/me` should also delete the Clerk identity (`clerkClient.users.deleteUser`) — restore the behaviour `docs/security.md` still documents.
7. Swagger: keep the `jwt` bearer scheme; update its description to "Clerk session token".

**Delete in this phase:** `auth.controller.ts`, `auth.service.ts`, `password.service.ts`, `token.service.ts`, `oauth/google.service.ts`, and the `AuthUser`/`AuthSession`/`AuthToken` schemas — but do it **after** Phase 5's export script has run against the old collections.

---

## 6. Phase 2 — Web on `@clerk/nextjs`

1. `pnpm --filter web add @clerk/nextjs`.
2. `app/layout.tsx`: wrap in `<ClerkProvider>` (outside `<Providers>`), themed via the `appearance` prop to match the existing design tokens.
3. **Add `src/middleware.ts`** with `clerkMiddleware()` + `createRouteMatcher` protecting `/dashboard`, `/accounts`, `/records`, `/planning`, `/analysis`, `/settings`. This replaces the per-layout server session check.
4. `(app)/layout.tsx`: replace `getServerSession()` with `const user = await currentUser()` (or `auth()` + a `UsersService`-backed profile fetch); keep the redirect as a belt-and-braces check.
5. `lib/use-pocketly-client.ts`: source `getToken` from `useAuth()` (`@clerk/nextjs`) — the SDK contract is unchanged, so `features/*/hooks.ts` need no edits. Mirror `apps/mobile/src/lib/api-client.ts` exactly.
6. Pages:
   - `sign-in/[[...sign-in]]/page.tsx` → `<SignIn />` (catch-all route already correct).
   - `sign-up/[[...sign-up]]/page.tsx` → `<SignUp />`.
   - **Delete** `forgot-password/`, `reset-password/`, `verify-email/`, `auth/callback/` — Clerk owns all four flows.
   - `mcp-connect/page.tsx` → delete (Clerk renders the OAuth consent screen).
7. Settings:
   - `security-hooks.ts` → delete; replace the section with `<UserProfile />` (covers password change, active devices, connected accounts, MFA) or `useSessionList()` if we want to keep the current custom layout.
   - `connections-hooks.ts` → re-point at Clerk per D6; keep the "instant revoke" `DELETE /mcp-connections/{clientId}` call **only if** we keep the deny-list (see Phase 4, step 6).
   - `settings-view.tsx` (1050 lines) needs a focused pass: profile fields split between Clerk-owned (name, email, avatar) and Pocketly-owned (`currency`, `timezone`, `phone`).
8. `components/app-sidebar.tsx` → `useUser()` / `<UserButton />` for the account menu and sign-out.
9. **Delete** `lib/auth-client.ts`, `lib/auth-token.ts`, `lib/get-session.ts`.

---

## 7. Phase 3 — Google sign-in

Nothing to build: enabling the Google social connection (Phase 0.3) makes `<SignIn />` render the Google button, and `@clerk/expo` already handles it on mobile. Verify after import that a legacy Google-only user (`passwordHash: null`, `googleId` set) signs in and lands on the *same* Clerk identity as their email — that's what D3's `external_id` + email-fallback matching protects.

---

## 8. Phase 4 — MCP OAuth via Clerk

The API stops being an authorization server and becomes only a *protected resource*.

1. **Delete** `auth/oauth/oauth.controller.ts`, `oauth.service.ts`, `jwt.service.ts`, all `oauth-*.dto.ts`, and the `OAuthClient`/`OAuthCode`/`OAuthConsent` schemas. Clerk now hosts `/authorize`, `/token`, `/register` (DCR), `/jwks` on its Frontend API domain, with persistent keys — fixing the per-boot keypair bug.
2. **Keep** `well-known.controller.ts`, reduced to *protected resource metadata* only:
   ```
   GET /.well-known/oauth-protected-resource[/mcp]
   { resource: "<API>/mcp",
     authorization_servers: ["https://clerk.<domain>"],
     scopes_supported: [...], bearer_methods_supported: ["header"] }
   ```
   Delete the `oauth-authorization-server` and `openid-configuration` handlers — MCP clients follow `authorization_servers` to Clerk's own metadata. Keep the `WWW-Authenticate: Bearer resource_metadata="…"` header in `McpAuthGuard` (that discovery hop is what makes Claude/other clients work).
3. `McpAuthGuard` verifies a **Clerk OAuth access token** instead of our RS256 JWT. Two candidate APIs — **verify the exact one against current Clerk docs before writing code**:
   - `getAuth(req, { acceptsToken: 'oauth_token' })` from `@clerk/express`, or
   - `clerkClient.idPOAuthAccessToken.verifyAccessToken(token)` from `@clerk/backend`.
   Either way the result yields the Clerk `userId` + granted scopes; resolve `User` by `authUserId` exactly as today.
4. `mcp-context.ts#requireScope`: read scopes from the verified auth object rather than `decodeJwt(token)` — a client-side decode with no signature check is the wrong primitive anyway.
5. `mcp.controller.ts`, `mcp-server.factory.ts`, and every file in `mcp/tools/` are **unchanged** — they only consume `mcpUser` and scopes.
6. **Decide on `mcp_revocations`**: Clerk can revoke a grant server-side, so the deny-list may be redundant. Keep it only if Clerk's revocation doesn't invalidate already-issued access tokens immediately; otherwise delete `McpConnectionsController`, the schema, and the paired call in `connections-hooks.ts`.
7. Re-test discovery end-to-end with a real MCP client (Claude) against dev before touching prod: unauthenticated POST `/mcp` → 401 + `WWW-Authenticate` → resource metadata → Clerk AS metadata → DCR → authorize → consent → token → authenticated tool call.

---

## 9. Phase 5 — User data migration

Write `apps/api/scripts/migrate-users-to-clerk.ts` (mirroring the existing `scripts/backup-db.ts` style), run once per environment:

1. Read every `auth_users` doc + its `users` profile.
2. For each, call Clerk `POST /v1/users` (`clerkClient.users.createUser`) with:
   - `email_address: [email]`, `skip_password_requirement: true` for Google-only users,
   - `password_digest: <argon2 PHC string>` + `password_hasher: "argon2id"` when `passwordHash` exists,
   - `first_name`/`last_name` derived from the profile `name`,
   - `external_id: <AuthUser._id>`,
   - `public_metadata`/`unsafe_metadata`: nothing needed — `currency`/`timezone` stay in Mongo.
3. Respect Clerk's rate limits: batch with a small concurrency cap and retry on 429; log every mapping `oldId → user_xxx` to a JSON file (the script must be **idempotent** — re-running should skip users whose `external_id` already exists).
4. Second pass: for each mapping, `users.updateOne({ authUserId: oldId }, { $set: { legacyAuthUserId: oldId, authUserId: clerkId } })`. Add `legacyAuthUserId?: string` to `user.schema.ts` (keep it — it's the audit trail if anything needs reconciling).
5. Verify: count of Clerk users == count of `auth_users`; no `users` doc left with a non-`user_` `authUserId`; spot-check sign-in with a known password, a Google-only account, and an unverified account.
6. Email-verified state: pass through the existing `emailVerified` flag so verified users aren't asked to re-verify.
7. **Not migrated** (intentional): sessions (everyone is logged out once), password-reset/verification tokens in flight, and OAuth consents — MCP users must reconnect once. Say so in the release note.
8. Keep the old collections (`auth_users`, `auth_sessions`, `auth_tokens`, `oauth_*`) for a rollback window, then drop them in a follow-up.

---

## 10. Phase 6 — Cleanup

- Remove deps: api → `@nestjs/jwt`, `@node-rs/argon2`, `cookie`, and `jose` if unused after Phase 4; web → nothing to remove beyond dead files; root `package.json` also carries stray `@node-rs/argon2`, `cookie`, `jose`, `@types/cookie` that should go.
- Delete `common/auth/session-cookie.ts` and the cookie-name constants.
- Regenerate the SDK + OpenAPI (`pnpm --filter api docs:generate`) after the auth routes disappear — `packages/sdk/src/generated/schema.ts` and the Postman collection both change.
- Update `docs/security.md` and `docs/architecture.md` — they already describe the Clerk world, so this is mostly re-verifying each claim (`ClerkAuthGuard`, webhook, `@clerk/express`) rather than rewriting.
- Grep for stale comments referencing "Better Auth" (`mcp-connections.controller.ts`, `connections-hooks.ts`).

---

## 11. Tests

- Rewrite `mcp/mcp-auth.guard.spec.ts` around the Clerk verification call (mock it), keeping the existing cases: missing token, invalid token, unknown user, happy path.
- `users/users.service.spec.ts` — rename to Clerk ids; keep the Clerk-delete assertion for `DELETE /users/me`.
- `transactions.integration.spec.ts` (cross-user isolation) must keep passing with the new guard — it's the single most valuable test here.
- Add a webhook signature-verification test (valid, tampered, missing).
- Manual smoke matrix before prod cutover: web password sign-up → verify email → sign-in → Google sign-in → session revoke → password change → account delete; mobile sign-in + authenticated read; MCP connect + read tool + write tool + disconnect.

---

## 12. Suggested order & rollback

```
Phase 0 (dashboard/env)
  └─ Phase 5 export script written & dry-run against dev
       └─ Phase 1 (API session auth)  ─┐
       └─ Phase 2 (Web UI)            ─┼─ land together; the API and web
       └─ Phase 3 (Google, ~free)     ─┘  cutover cannot be split
            └─ Phase 4 (MCP OAuth)   ← independent, can ship a day later
                 └─ Phase 6 cleanup + docs
```

Rollback: the old code is one `git revert` away and the old collections are still
there — but every user imported into Clerk who has since changed their password would
lose that change. So keep the rollback window short (hours, not days) and do prod on a
low-traffic window.

---

## 14. What actually landed, and what changed from this plan

Implemented (API typechecks, 15 suites / 54 tests pass; web typechecks and builds):

- **API**: `common/auth/clerk-auth.guard.ts` replaces `AppAuthGuard`; `clerkMiddleware({ authorizedParties })` + `rawBody: true` in `main.ts`; `webhooks/` module (`user.updated` → `UsersService.syncFromClerk`, `user.deleted` → `eraseByClerkId`); `DELETE /users/me` now deletes the Clerk identity. The entire `src/auth/` tree, `app-auth.guard.ts` and `session-cookie.ts` are gone, along with `@nestjs/jwt`, `@node-rs/argon2` and `cookie`.
- **MCP**: `McpAuthGuard` verifies Clerk OAuth tokens via `getAuth(req, { acceptsToken: 'oauth_token' })`; `mcp/well-known.controller.ts` serves protected-resource metadata only; `requireScope` now reads Clerk's verified scopes instead of decoding the token.
- **Web**: `ClerkProvider`, `src/proxy.ts`, Clerk `<SignIn/>`/`<SignUp/>`, Clerk-backed `security-hooks.ts`, and Clerk `getToken` feeding the SDK. `auth-client.ts`, `auth-token.ts`, `mcp-oauth.ts` and the forgot-password / reset-password / verify-email / auth-callback / mcp-connect pages are deleted.
- **Migration script**: `apps/api/scripts/migrate-users-to-clerk.ts` (`pnpm --filter api migrate:clerk`, `--dry-run` supported).

Four deviations from the plan above, all forced by what the tooling actually offers:

1. **`src/middleware.ts` → `src/proxy.ts`.** Next.js 16 renamed Middleware to Proxy (`node_modules/next/dist/docs/.../16-proxy.md`). Same `clerkMiddleware()` inside; the build output confirms it as `ƒ Proxy (Middleware)`.
2. **Settings → Connections is backed by our own records, not Clerk's grants** (open item D6/§13.4). `@clerk/backend` 3.16 exposes no way to list a user's OAuth grants, so `McpAuthGuard` records each client in a new `mcp_connections` collection and `GET /mcp-connections` lists it. It answers "what has used my data, and when" rather than "what have I consented to" — arguably the more useful question, but it is a different one.
3. **`mcp_revocations` survives, scoped to JWT-format tokens.** Opaque `oat_` tokens are verified against Clerk's store on every request, so revoking there is already immediate; JWT-format ones are not, hence the deny-list, now keyed off the `iat` of a token Clerk has *already verified*.
4. **Sessions use `user.getSessions()`**, not `useSessionList()` — only the former returns sessions carrying `latestActivity` and `revoke()` in `@clerk/nextjs` 7.7.

Still open:

- **Phase 0** — every Clerk dashboard step, and filling in the new env vars in `apps/api/.env` / `apps/web/.env.local`. Nothing runs until `CLERK_SECRET_KEY` / `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` exist.
- **Phase 5** — running `migrate:clerk` (dry-run first) against dev, then prod.
- ~~**§13.2** — whether Clerk OAuth apps support custom scopes.~~ **Resolved: they don't.** Clerk issues only from its fixed set (`openid`/`profile`/`email`/`offline_access`/metadata/org) and documents custom scopes as "not yet available". The fallback is applied: `GRANTED_SCOPES` in `mcp-auth.guard.ts` grants an authorized connection both `pocketly:read` and `pocketly:write`, the per-tool checks stay in place, and `scopes_supported` in the resource metadata now advertises Clerk's real scopes instead of ours. **This is a behaviour regression from the old system: users can no longer grant an MCP client read-only access.** See docs/security.md.
- **Unverified end-to-end**: no flow has been exercised against a real Clerk instance yet — sign-in, Google, the MCP discovery hop, and the webhook all need the manual smoke matrix in §11.
- Mobile needs no code change, but its `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` must point at the same instance as web and API.

## 13. Open items to verify against current Clerk docs during implementation

1. Exact helper for verifying a Clerk-issued **OAuth access token** in Express/Nest (`getAuth(req, { acceptsToken: 'oauth_token' })` vs `clerkClient.idPOAuthAccessToken.verifyAccessToken`).
2. Whether **custom scopes** (`pocketly:read`/`pocketly:write`) are supported on Clerk OAuth Applications (D5).
3. Whether **Dynamic Client Registration** needs explicit enabling per OAuth app, and whether Clerk's AS metadata advertises the `registration_endpoint` MCP clients expect.
4. Backend API endpoints for **listing/revoking a user's OAuth grants** (D6), and whether revocation invalidates live access tokens (Phase 4, step 6).
5. Whether the session token's default claims include `email`/`name`, or whether `ClerkAuthGuard` needs a `clerkClient.users.getUser` call (and thus a custom JWT template to avoid it).
6. `@clerk/expo` version compatibility with the chosen instance/API version, since mobile is already pinned at `^4.3.0`.
