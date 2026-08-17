# Post-MVP Plan — three tracks, zero inference cost

Replaces the deprecated in-app AI assistant (`docs/ai-assistant-plan.md`). Every item here is
pure domain logic or documentation: **no LLM API key, no per-user inference cost.**

Ordering recommendation: **C first** (a day, and it makes the MVP claim true), then **A**, then
**B**.

| Track | What | Why now |
|---|---|---|
| A | Recurring transactions | The biggest unautomated chore in the product; §83 Phase 2 |
| B | Rule-based insights | The value people want from "AI insights", as arithmetic |
| C | MCP as the official AI story | Makes the assistant deprecation coherent, and closes the MVP |

---

## Track C — MCP as the official AI story

**Do this first.** It is mostly writing, it unblocks an honest "MVP complete" claim, and until the
spec is amended the repo contradicts itself about whether Pocketly has an AI feature.

### C1. Amend `requirement.md`

| Section | Change |
|---|---|
| §33–38 | Reframe: the assistant is **not in-app**. Pocketly exposes an MCP server; the user connects their own AI client and pays for their own inference. Keep §38 (accuracy) and §36 (never silently modify) — both still hold, enforced by the tools and by the MCP client's own confirmation step. |
| §58 AI API | Delete `/ai/chat`, `/ai/action/preview`, `/ai/action/confirm`. They were never built. §60 Connection API and `/mcp` are the real surface. |
| §82 MVP | Replace "AI Finance Assistant / read-only questions / transaction creation with confirmation" with "MCP server — connect any AI client". |
| §85 criteria 13–16 | Rewrite against MCP: connect an AI client, ask about finances through it, request a transaction, confirm it in that client. **All four already pass** — ChatGPT and Claude both connected today. |
| §7/§8/§45/§52 | Stale auth sections: Better Auth → Clerk (carried over from the auth migration, still outstanding). |
| §44–46 | Mobile app deprecated; mark it so rather than leaving it as a requirement. |

Say plainly in §33 *why* the architecture is BYO-model, so the decision survives the next person
who wonders where the chat window is: unbounded per-user inference cost against no revenue, and a
worse model than the one the user already pays for.

### C2. Make connecting discoverable

Today `POST /mcp` is effectively an undocumented endpoint. `mcp-guide/page.tsx` is **12 lines**,
and Settings → Connections only lists what has already connected. If MCP is the AI story, it needs
a front door:

- Flesh out `/mcp-guide`: what it is, the one URL to paste (`https://api.pocketly.hasanraiyan.me/mcp`), per-client steps for Claude and ChatGPT, and what the AI can and cannot do.
- Settings → Connections: an empty state that *explains* rather than showing an empty list — "No AI clients connected. Connect one →".
- One line about the trust model: a connected client can read **and write** all financial data, and disconnect is immediate.

### C3. Tell the truth about scope

Custom OAuth scopes aren't supported by Clerk yet, so a connection is all-or-nothing read+write
(`GRANTED_SCOPES` in `mcp-auth.guard.ts`, and `docs/security.md`). The consent screen says
`openid profile email`, which does not hint at "full access to your money". The guide should say
it in plain words — this is the one place where the gap between what the screen says and what the
grant does is user-visible.

---

## Track A — Recurring transactions

Rent, salary, subscriptions, EMIs — re-entered by hand every month today. §83 Phase 2, and the
single highest-value automation in the backlog.

### A1. Model

New collection, deliberately **not** a flag on `Transaction`: a rule is a template that *spawns*
transactions, and conflating the two makes every existing query ambiguous about whether it should
see the template.

```ts
// recurrence rule — mirrors the Transaction fields it will stamp out
{ userId, type, amount, description, note, categoryId, accountId, toAccountId,
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly',
  interval,            // every N periods
  startDate, endDate?, // endDate null = open-ended
  nextRunAt,           // the index the scheduler queries
  lastRunAt?, timezone,
  paused, deletedAt }
```

Spawned transactions carry `recurrenceId` so a rule can show its history and so "delete this rule
and its future occurrences" is answerable without guessing.

Two decisions worth making explicitly:

- **Generate on schedule, not on read.** A "virtual" projection that materializes on view is tempting and wrong here: balances, budgets, and analysis all aggregate over real rows, so a virtual transaction would be invisible to every one of them.
- **Post-date, don't back-fill silently.** If the service is down for three days, the catch-up run should create the missed occurrences with their *original* dates, and the run must be idempotent — see A3.

### A2. Scheduling — reuse the BullMQ pattern that exists

`notification-dispatcher.service.ts` already does exactly this shape:

```ts
await queue.upsertJobScheduler('daily-inactivity-reminder', { pattern: '0 20 * * *' });
```

Add a `recurrences` queue with a daily scheduler, plus a processor that finds every rule with
`nextRunAt <= now`, creates the transaction through `TransactionsService` (**not** the model
directly — balances, budget alerts, and notification triggers all hang off the service), then
advances `nextRunAt`.

`date-fns-tz` is already a dependency, and `User.timezone` already exists — "the 1st of the month"
must mean the user's 1st, not UTC's.

### A3. The two bugs this feature always ships with

1. **Double-posting.** A retry, a restart, or two API instances running the scheduler all cause duplicates. Guard with a unique index on `(recurrenceId, occurrenceDate)` so the second insert fails rather than silently doubling someone's rent. Do this at the database, not in application logic.
2. **Month-end drift.** A rule starting Jan 31 must not walk backwards to the 28th and stay there. Compute each occurrence from `startDate` + N periods, never from the previous occurrence.

Both belong in the unit tests before the feature is wired up: they are cheap to test and expensive to discover in production.

### A4. Surface

- API: full CRUD on `recurrences` (the existing module shape — controller, service, Zod DTOs, cursor pagination), plus `POST /recurrences/:id/pause`.
- MCP: add to the shared tool surface so a connected AI can manage them too — that is now the AI story.
- Web: `features/recurrences/`, a Planning-page section, and an indicator on transactions that came from a rule.

---

## Track B — Rule-based insights

What people actually want from "AI insights" is arithmetic over data you already have: *"food is
30% above your 3-month average"*, *"at this pace you'll exceed the Food budget in 6 days"*,
*"₹4,200 of subscriptions renewed this month"*. No model, no cost, no hallucination — and
critically, **no chance of inventing a number**, which §38 spends a whole section worrying about.

### B1. Build on what exists

`analysis.service.ts` already computes `getOverview`, `getCategoryBreakdown`, `getCashFlow`,
`getAccountBreakdown`. `common/finance/` already has `calculate-budget-status`,
`resolve-analysis-range`, `get-period-window`, `format-money`. Insights are a thin layer over
these, not new aggregation.

### B2. A starter set

| Insight | Rule |
|---|---|
| Category spike | Category spend > 1.3× its 3-month average, and above a currency floor so ₹30 → ₹50 isn't "a 67% spike" |
| Budget pace | Projected month-end spend (spend-so-far ÷ days-elapsed × days-in-month) > limit |
| Largest expense | Top single transaction this period |
| New merchant | A description not seen in the prior 3 months, above a floor |
| Income vs expense | Net negative for the period, with the delta |
| Recurring load | Total of active recurrence rules per month (needs Track A) |

Each is a pure function `(aggregates) → Insight | null`, unit-testable with no database. That
keeps the surface honest: an insight either fires from real numbers or doesn't appear.

### B3. Design rules that decide whether this feels smart or noisy

- **Thresholds need a floor as well as a ratio.** Percentage-only rules are the reason this class of feature gets ignored.
- **Rank and cap.** Compute all, show the top 3. A wall of insights is noise.
- **Say the number and the comparison.** "₹8,400 on Food, 34% above your ₹6,250 average" — not "your food spending is high".
- **Empty state is a real state.** A new user with two transactions should see nothing, not six insights built on a two-day baseline. Require a minimum history before a rule can fire.
- **No advice.** Report what the data says; don't say what to do. It's a ledger, not a coach.

### B4. Surface

`GET /api/v1/analysis/insights` (period-scoped, same query shape as the rest of analysis) →
dashboard card. Cheap to compute; cache per user per period if it shows up in profiling.

---

## Sequencing

```text
C (~1 day)      spec amendment + MCP guide + connections empty state
   ↓            → "MVP complete" becomes an honest claim
A (~3–5 days)   recurrence model, scheduler, idempotency, CRUD, web surface
   ↓            → the biggest manual chore is automated
B (~2–3 days)   insight rules over existing aggregates, dashboard card
```

A before B is deliberate: recurring transactions produce data that makes the "recurring load"
insight meaningful, and A is the one users will actually notice.

## Open questions

1. **Recurrence catch-up window** — if the service was down a week, create every missed occurrence, or only the most recent, or ask? My recommendation: create them all with original dates (the ledger should be correct), capped at ~30 days to bound a pathological restart.
2. **Insight thresholds** — 1.3× and the currency floors are guesses. Worth tuning against your own real data before shipping.
3. **Do recurrences need approval on creation?** They post money automatically. My recommendation: no in-app confirmation (the user wrote the rule), but a notification when one posts, reusing the FCM path already built.
