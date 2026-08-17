# Financial Intelligence Plan

Pocketly's current surface — accounts, transactions, transfers, categories, budgets, analysis — is
commoditized. Every expense tracker does CRUD and pie charts. This plan is the move from
*recording the past* to *supporting decisions*: the product should answer "where am I heading, and
what should I do next", not only "where did my money go".

Tracks issue [#3](https://github.com/hasanraiyan/pocketly-finance-manager/issues/3). Successor to
`post-mvp-plan.md`, and it keeps that document's constraint: **no LLM API key, no per-user
inference cost.** Everything here is arithmetic over data the user already has. A rule either
fires from real aggregates or stays silent — the same property that makes `InsightsService`
structurally incapable of inventing a number.

```
Transactions → Accounts + Budgets + Goals → Financial context
             → Forecast + Insights + Scenarios → Actionable decisions → AI / MCP
```

---

## The one architectural idea

**No new query logic in feature services.** One loader gathers the raw aggregates; every
capability is a pure function over what it returns.

```
FinancialContextService.load(user, window)   ← the only thing that touches Mongo
        ↓  { balances, recurringOccurrences, budgets, goals, dailySpendHistory, periodTotals }
   pure calculators in common/finance/
        ↓
 forecast · safe-to-spend · goal projection · scenario diff · health score · insights · rule eval
        ↓
   REST controllers  ·  MCP tools  ·  BullMQ workers  ·  exports
```

This is what the issue means by "centralize financial calculations so Web, future mobile clients,
MCP, exports and other clients use the same business logic". It also means every number in the
product is unit-testable with no I/O, which is the only way a forecast stays trustworthy.

`common/finance/` already works exactly this way — `insight-rules.ts`, `next-occurrence.ts`,
`calculate-budget-status.ts` are pure, each with a co-located `*.spec.ts`, each called by a service
that owns the queries. The new calculators join them rather than inventing a second pattern.

### Conventions the new code inherits

- Integer minor units everywhere; round only at output.
- Windows resolved in the user's timezone via `getPeriodWindow` / `resolveAnalysisRange`, never
  raw UTC arithmetic.
- Every query filters `{ _id, userId }` together; soft delete via `deletedAt`.
- Schemas register once in `common/database/database.module.ts` — domain modules never call
  `forFeature`.
- Zod DTOs (`createZodDto`) so OpenAPI generates itself; regenerate the spec and the SDK after any
  route change.

---

## New calculators — `apps/api/src/common/finance/`

| File | Responsibility |
| --- | --- |
| `project-recurring.ts` | Expand active recurrence rules into dated occurrences across a window. Wraps `occurrencesBetween`; skips paused/deleted, respects `endDate`. |
| `forecast-balance.ts` | Opening balance + projected recurring in/out + a discretionary daily run-rate from history → daily balance points and an end-of-period figure. |
| `safe-to-spend.ts` | Balance − remaining recurring obligations − committed-but-unspent budget − goal contributions due − minimum reserve. Clamps at 0 and returns the deduction breakdown, so the UI can explain the number instead of asserting it. |
| `goal-projection.ts` | Target / saved / contribution rate → projected completion date, required monthly rate, on-track flag, shortfall. |
| `simulate-scenario.ts` | Applies a scenario delta to forecast inputs and diffs against the baseline: projected balance, goal completion dates, monthly cash flow, budget health. |
| `health-score.ts` | Six weighted components, each 0–100 with its own reason string. |
| `evaluate-money-rule.ts` | Pure predicate — rule + current metric → fires or doesn't, with the message. |
| `insight-rules.ts` *(extend)* | New kinds plus an `action` field, so every insight says what to do. |

---

## New modules — `apps/api/src/`

### `intelligence/`

The projection surface, deliberately separate from `analysis/`: **analysis reports what happened,
intelligence projects what will.** Holds `FinancialContextService` (the loader) and four thin read
services over it — `ForecastService`, `SafeToSpendService`, `ScenarioService`,
`HealthScoreService`.

```
GET  /intelligence/forecast
GET  /intelligence/safe-to-spend
GET  /intelligence/health
POST /intelligence/scenario
```

### `goals/`

Modelled directly on `budgets/`: soft delete, id-cursor pagination, a `withProjection()` that
decorates each stored goal the way `withStatus()` decorates a budget. Full CRUD plus
`POST /goals/{id}/contributions`.

**Progress is derived when it can be.** A goal takes an optional `accountId`; when set, progress
*is* that account's balance and can never drift from reality. Unlinked goals carry a stored
`savedAmount` that the contributions endpoint adjusts.

Contributions are deliberately **not** written as `Transaction` records. Moving money into savings
is a transfer the user may already have recorded, and stamping a second one would double-count in
every balance, budget and analysis query — the same reasoning the `Recurrence` schema gives for
not being a flag on `Transaction`.

### `money-rules/`

User-defined thresholds — category over an amount, balance under a floor, an unusually large
transaction, a weekly summary, goal progress reminders. CRUD plus a BullMQ evaluator whose
scheduler copies `recurrences.scheduler.ts` (`upsertJobScheduler` by name so N API instances
converge on one schedule; warn rather than crash when Redis is absent).

Delivery reuses `NotificationDispatcherService.enqueueNotification`, adding `MONEY_RULE` and
`GOAL_PROGRESS` to `NOTIFICATION_TYPES`.

Each rule stores `lastFiredAt` and re-arms only on threshold re-crossing. Without that, a balance
sitting below its floor produces one alert per evaluation run forever, and the user turns
notifications off — which costs more than the feature was worth.

---

## MCP

The existing tools already reuse the domain services the REST API uses, so everything above
reaches AI clients as soon as the services exist. Registered in `mcp-server.factory.ts`:

- **`get_outlook`** — metric enum `forecast | safe_to_spend | health | goals`. Multiplexes on
  `metric` the way `get_analysis` does, rather than registering four near-identical tools.
- **`simulate_scenario`** — the tool that answers *"Can I afford this ₹59,000 phone?"*.
- **`manage_goal`**, **`manage_money_rule`** — action-enum CRUD, same shape as `manage_budget`.
- **`get_financial_overview`** *(extend)* — add `safeToSpend` and a forecast summary so one call
  answers "where do I stand".

Known constraint, carried from `post-mvp-plan.md` §C3: Clerk doesn't support custom scopes yet, so
an MCP grant is all-or-nothing read+write. `manage_money_rule` inherits that — a connected client
can create alert rules. `/mcp-guide`'s trust-model section has to say so in plain words.

---

## Web — `apps/web/src/`

The dashboard stops leading with totals and starts leading with position:

```
position hero (balance · safe-to-spend · forecast)
health score
goals progress
insights, each with an action
accounts · budgets
recent records
```

Per-block `Suspense` streaming stays as it is — each block resolves its own data behind its own
boundary rather than five blocks waiting on the slowest.

- New `/goals` route under `(app)`, plus a `NAV_ITEMS` entry in `app-sidebar.tsx`.
- Money rules become a section on `/planning`, beside budgets and recurrences.
- The scenario simulator is a "Can I afford it?" dialog launched from the hero.
- Feature hooks follow `features/budgets/hooks.ts`: types off `components["schemas"][...]`, React
  Query, optimistic delete, toast on error.
- The insights card must tolerate a `kind` it doesn't recognise — the enum grows server-side, and
  a stale web deploy shouldn't blank the card.

---

## Delivery order

Each phase is one vertical slice and one commit: pure calculator + spec → service, DTO, route →
OpenAPI + SDK regen → web UI → docs.

| # | Phase | Output |
| --- | --- | --- |
| 0 | Foundation | This document; `intelligence/` module; `FinancialContextService`; `project-recurring.ts` |
| 1 | Goals | `goals/` module, `goal-projection.ts`, `/goals` page |
| 2 | Forecast | `forecast-balance.ts`, `GET /intelligence/forecast`, dashboard forecast |
| 3 | Safe-to-spend | `safe-to-spend.ts`, endpoint, hero with deduction breakdown |
| 4 | Insights | five new rule kinds, `action` field, richer insights card |
| 5 | Scenarios | `simulate-scenario.ts`, `POST /intelligence/scenario`, affordability dialog |
| 6 | Health score | `health-score.ts`, endpoint, component-by-component card |
| 7 | Money rules | `money-rules/` module, evaluator worker, `/planning` section |
| 8 | MCP + docs | new and extended tools, dashboard restructure, doc updates |

Ordering is not arbitrary: phase 0 precedes everything because every later phase reads the
context; phase 1 precedes 3 and 5 because safe-to-spend and scenarios both consume goal
commitments; phase 2 precedes 3, 5 and 6.

## Success criteria

From the issue — a user can answer these without reading a chart:

> Can I afford this? · Am I on track for my goal? · What will my balance be at month end? ·
> What should I change this month?

And can ask the same questions of their own AI client, through MCP, against their own data.
