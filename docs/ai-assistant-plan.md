# AI Finance Assistant — Implementation Plan

> ## ⚠️ DEPRECATED — not being built
>
> **Decided 2026-08-17. Superseded by the MCP server Pocketly already ships.**
>
> Two reasons, both good:
>
> 1. **No funding for inference.** An in-app assistant means Pocketly pays per token for every
>    user, on a product with no revenue. The cost is unbounded and grows with adoption — the
>    opposite of what a free tier can absorb.
> 2. **It reinvents what already works.** `POST /mcp` already exposes the same read and write
>    tools over the same domain services, and Claude and ChatGPT are both connected to it. In that
>    architecture the *user* brings the model and pays for it via their own subscription,
>    Pocketly's inference cost is **zero**, and the model on the other end is better than anything
>    we'd have wired up ourselves.
>
> **What this means for the spec**: `requirement.md` §33–38 and §58 describe an in-app assistant,
> and §85's acceptance criteria 13–16 assume one. Those need amending to define Pocketly's AI story
> as MCP / bring-your-own-model. Once amended, **every MVP acceptance criterion passes** — the AI
> assistant was the only outstanding gap.
>
> Kept for the record because the analysis is still useful if funding ever changes: the HITL
> mapping in §3, the security properties in §4, and the tool-catalog sharing in §7 would all still
> apply. The MCP server already satisfies §36 by a different route — the MCP client renders its
> own confirmation before a write tool runs.

---

Closes the last MVP gap. `requirement.md` §33–38 and §58 specify the assistant; acceptance
criteria **13–16** (ask about finances, request a transaction, review the proposal, confirm it)
are the only ones the product currently fails.

**Stack**

| Layer | Choice |
|---|---|
| Agent | Deep Agents (`deepagents`, TypeScript) on LangGraph, HITL interrupts |
| Model | **OpenAI** via `@langchain/openai` (`ChatOpenAI`) |
| Transport | **AG-UI protocol only** — no CopilotKit runtime, no `@copilotkit/react` |
| Thread state | LangGraph checkpointer → **MongoDB** |
| Long-term memory | File-based, `CompositeBackend` routing `/memories/` → `StoreBackend` → **MongoDB store** |
| Host | Inside the NestJS API |

Status: **plan only, nothing implemented.**

---

## 1. Architecture

```text
Next.js  ──  @ag-ui/client (HttpAgent)  ──POST /api/v1/ai/agent (SSE)──►  NestJS
   │              AG-UI events ◄─────────────────────────────────────────    │
own shadcn chat UI                                                     AG-UI adapter
(no CopilotKit components)                                                   │
                                                                    Deep Agents graph
                                                                   (LangGraph + HITL)
                                                                      │           │
                                                          domain services    persistence
                                                    (accounts, transactions,   ├── checkpointer → Mongo  (thread state, pending approvals)
                                                     budgets, categories,      └── store        → Mongo  (/memories/, cross-thread)
                                                     analysis)
```

`OPENAI_API_KEY` stays server-side. §34/§79 require the AI layer to consume the same domain
services and never touch the database directly — which it doesn't: it calls services, and the two
persistence layers above hold only agent state, not financial records.

---

## 2. Why Deep Agents' HITL *is* the spec

§36 is the requirement that shapes the design:

> **AI MUST NEVER silently modify financial data.**

That is not a prompt instruction to be hoped for — it is `interruptOn`. The framework halts the
graph *before* the tool executes and will not proceed without a human decision.

| `requirement.md` | Mechanism |
|---|---|
| §36 AI generates proposed action | Tool call intercepted by `interruptOn`, never executed |
| §37 confirmation card | Interrupt payload — tool name + args |
| Confirm | `Command({ resume: { decisions: [{ type: "approve" }] } })` |
| Cancel | `{ type: "reject", message }` — model receives the feedback and can retry |
| — | `{ type: "edit", edited_action }` — user fixes amount/category *before* execution |

The `edit` decision is a capability the spec never asked for and users will immediately want
("no, ₹450, and it was Groceries"). Without it, a wrong proposal means cancel and retype.

---

## 3. The AG-UI ↔ LangGraph HITL mismatch (the crux)

The two protocols express approval **differently**, and the adapter is where they meet:

- **AG-UI**: agent emits a tool call with no result and ends the run (`RUN_FINISHED`). The client renders approval UI and starts a *new run* whose messages include the tool result.
- **LangGraph**: the graph *pauses mid-execution* and resumes on the same `thread_id` via `Command({ resume })`.

```text
graph interrupt          →  TOOL_CALL_START / TOOL_CALL_ARGS (proposed args) / TOOL_CALL_END
                            RUN_FINISHED                      ← stream ends, graph stays paused
user decides             →  new POST carrying the decision
decision                 →  Command({ resume: { decisions: [ … ] } }) on the same thread_id
graph executes for real  →  TOOL_CALL_RESULT, TEXT_MESSAGE_*, RUN_FINISHED
```

Two things that silently break §36 if confused:

1. **The AG-UI "tool result" is the human decision, not the tool's return value.** The tool has not run at that point; its real result appears in the next run.
2. **The graph is paused, not finished.** `RUN_FINISHED` describes the stream, not the agent. If the process dies here the pending approval must survive — see §5.

---

## 4. Four security properties

**1. The model never supplies a user id.** Tools have no `userId` parameter. The id comes from
`ClerkAuthGuard` and is injected into graph runtime config server-side; tools read it from there.
Every service call is `transactions.findAll(userIdFromConfig, …)`.

**2. A thread belongs to exactly one user.** `threadId` comes from the client, and a checkpointer
resumes *any* thread id handed to it. Without a check, passing someone else's conversation id
replays their financial history and their pending proposals. **Real cross-tenant leak.**
Mitigation: `ai_conversations` mapping `threadId → userId`, checked before every run and resume.

**3. The store must be namespaced per user.** This is new with memory and has the same shape as
(2): a `BaseStore` namespace is whatever you pass it, so a global `("memories",)` namespace means
every user shares one memory file tree — one person's financial notes surfacing in another's
conversation. Namespace must be `("memories", userId)`, derived server-side, never from the model
or the request body.

**4. Never trust client-supplied message history.** AG-UI's `RunAgentInput` carries a `messages`
array and the wire format invites the client to send accumulated history. Our checkpointer holds
the authoritative history — so **take only the newest user message (or decision) and ignore the
rest**. Otherwise a crafted request fabricates prior turns: a fake assistant message asserting a
balance, or a fake tool result. AG-UI's default client/server pairing doesn't have to worry about
this; we do, precisely because we hold server-side state.

---

## 5. Persistence: two layers, both MongoDB

They are different things and both are required:

| Layer | Holds | Scope | Lost without it |
|---|---|---|---|
| **Checkpointer** | Thread state, message history, **paused interrupts** | One `thread_id` | Conversations and pending approvals on restart |
| **Store** | `/memories/` files | Cross-thread, per user | Long-term memory |

`MemorySaver` and `InMemoryStore` are in-process — a restart or a second API instance loses
everything. Per §3 the graph sits paused across exactly the approval window, so this is not
theoretical: a user confirming a transaction after a deploy would hit a thread that no longer
exists.

**Verify before building**: the JS ecosystem documents `PostgresStore` for production stores; a
MongoDB `BaseStore` implementation may not exist in JS. Three options, in order:

1. An official/community Mongo store package, if one exists and is maintained.
2. **Implement `BaseStore` over Mongoose** — you already run Mongo and Mongoose; the interface is small (get/put/search/list over namespace+key), and it keeps one datastore with one backup and retention story. This is my recommendation if (1) comes up empty.
3. Postgres or Redis — a second datastore for one feature.

The Mongo *checkpointer* is a separate question with a separate package; confirm both.

Both layers contain financial conversation content, so they inherit the same sensitivity and
deletion obligations as everything else (§63, §64 — account deletion must erase threads *and*
memories).

---

## 6. Memory design (file-based, `/memories/`)

```ts
backend: (config) => new CompositeBackend(
  new StateBackend(config),                    // default: ephemeral scratchpad, thread-scoped
  { "/memories/": new StoreBackend(config) },  // persistent, cross-thread, per-user namespace
),
store,                                          // Mongo-backed BaseStore
```

- Files outside `/memories/` are thread-scoped scratch — safe place for intermediate analysis.
- Files under `/memories/` persist across sessions. Routing is **longest-prefix match**, so a `/memories/tmp/` → `StateBackend` route is available later if some memory should stay ephemeral.
- **Never `FilesystemBackend`.** The framework's own guidance is explicit — *"Never use FilesystemBackend in web servers"* — and this process has the source tree and `.env` on disk. `StateBackend` + `StoreBackend` give the model a filesystem with no real disk behind it.

**What memory should hold**: durable preferences and context the user would otherwise repeat —
"salary lands on the 1st", "treat Swiggy as Food not Dining", "budgets are monthly". Seed the
system prompt with that intent, or memory fills with restated transaction data that the tools
already return more accurately.

**Memory poisoning is the real new risk.** Transaction notes are user-authored text that reaches
the model, and the model can now write to a store that persists into *every future conversation*.
An injected instruction in `/memories/` outlives the thread that created it. Today this is mostly
self-inflicted (your own notes, your own memory), but it stops being self-inflicted the moment
data arrives from outside the user — CSV import, bank sync, a shared ledger. Mitigations:
per-user namespacing (§4.3), a system-prompt line stating `/memories/` is data and never
instructions, and a Settings screen to view and clear memory (which §63/§64 arguably require
anyway).

---

## 7. Tools: reuse the MCP surface

`apps/api/src/mcp/tools/` already implements §35/§36's tool lists over the domain services, with
Zod schemas and LLM-facing descriptions. A second set would guarantee drift — the MCP client and
the in-app assistant answering the same question differently, every domain change needing two edits.

```text
ai/tools/catalog.ts   { name, description, schema, handler, kind: 'read' | 'write' }
   ├── mcp/…          registerTool on McpServer      (writes execute — MCP client confirms)
   └── ai/…           tool() from @langchain/core     (writes listed in interruptOn)
```

One wrinkle: the MCP tools are *consolidated* (`manage_account` with a five-value `action`).
`interruptOn` keys on **tool name**, so a tool can't be half-interrupted — `list` would require
approval alongside `delete`. **Split by kind for the LangChain adapter** (`get_accounts` read /
`manage_accounts` write); the MCP adapter keeps composing them into today's shape so the MCP
contract doesn't change.

---

## 8. Endpoint shape — a deliberate deviation from §58

§58 specifies `POST /ai/chat`, `/ai/action/preview`, `/ai/action/confirm`.

**AG-UI is a single run endpoint.** Approve/edit/reject flow back through the same POST as the
next run's input, so `/preview` and `/confirm` have nothing distinct to do: the preview *is* the
interrupt payload the client already holds, and the confirm *is* the next run.

Recommendation: **one endpoint, `POST /api/v1/ai/agent`**, and amend the spec. Keeping three
would mean three wrappers around one mechanism, or abandoning AG-UI's shape. This is a spec
deviation and should be an explicit decision rather than something found later in a diff.

---

## 9. What we build, since we're not using CopilotKit

CopilotKit ships a LangGraph→AG-UI adapter (`@copilotkit/sdk-js/langgraph`). Excluding it means
**we write the adapter** — the largest new piece of work here:

| Piece | Detail |
|---|---|
| Event emission | `RUN_STARTED` → content → `RUN_FINISHED`/`RUN_ERROR`, in order, per run |
| Text streaming | LangGraph token stream → `TEXT_MESSAGE_START/CONTENT/END` (or `TEXT_MESSAGE_CHUNK`) |
| Tool calls | `TOOL_CALL_START/ARGS/END` linked by `toolCallId`; `TOOL_CALL_RESULT` after resume |
| Interrupts | §3's mapping |
| State | Optional: todos and `/memories/` writes → `STATE_SNAPSHOT`/`STATE_DELTA` for a live plan view |
| Encoding | `@ag-ui/encoder`'s `EventEncoder`, or `data: <json>\n\n` by hand |

Protocol rules that are easy to violate and annoying to debug: every run starts with
`RUN_STARTED` and ends with `RUN_FINISHED`/`RUN_ERROR`; `TEXT_MESSAGE_CONTENT.delta` must be
non-empty; runs must not overlap on a thread.

Frontend uses `@ag-ui/client`'s `HttpAgent` against the Nest endpoint, rendered with the shadcn
AI primitives already vendored (`ui/message.tsx`, `bubble.tsx`, `message-scroller.tsx`). Verify
`HttpAgent` supports custom headers — it must carry the Clerk bearer token.

---

## 10. Agent configuration

```ts
const agent = await createDeepAgent({
  model: new ChatOpenAI({ model: "<chosen OpenAI model>" }),
  tools: [...readTools, ...writeTools],
  systemPrompt: POCKETLY_SYSTEM_PROMPT,
  interruptOn: {
    manage_transactions: { allowedDecisions: ["approve", "edit", "reject"] },
  },
  checkpointer,   // REQUIRED — without it interrupts silently don't fire
  store,          // REQUIRED for StoreBackend
  backend: compositeBackend,
});
```

Note on model tuning: earlier drafts of this document carried Claude-specific guidance (adaptive
thinking, `effort` sweeps, `max_tokens` covering thinking + text). **That is removed** — it is
Anthropic-only and would be actively misleading against OpenAI models. Pick the model and its
parameters from OpenAI's current lineup at implementation time; the agent code is
provider-agnostic through `ChatOpenAI`, so this is a one-line change if you switch later.

`TodoListMiddleware`, `FilesystemMiddleware` and `SubAgentMiddleware` are always on and can't be
removed — but with memory enabled that's now a feature rather than a tax: the filesystem tools
*are* the memory mechanism, and `task` delegation plus the scratchpad suit the §31/§32 multi-step
analysis work.

---

## 11. Grounding (§38)

1. **The numbers only exist in tool results** — the model has no other source.
2. **System prompt**: answer from tool results in this conversation; never carry a figure forward as current; never compute a balance from memory. **Memory is preferences and context, never figures** — a balance written to `/memories/` is stale the moment the next transaction lands.
3. **`getFinancialOverview` stays a tool, not an injected context block.** A snapshot injected at session start goes stale mid-conversation — and with persistent threads, "mid-conversation" can mean days later.

---

## 12. Files

**API** — new `apps/api/src/ai/`

| File | Purpose |
|---|---|
| `ai.module.ts` | Same domain imports as `McpModule` |
| `ai.controller.ts` | `POST /agent` — AG-UI run endpoint, SSE response |
| `agui/adapter.ts` | LangGraph stream → AG-UI events (§9) |
| `agui/interrupt.mapper.ts` | Interrupt ↔ tool-call/decision mapping (§3) |
| `agent.factory.ts` | `createDeepAgent(...)`, backend/checkpointer/store wiring |
| `persistence/mongo-checkpointer.provider.ts` | Thread state (§5) |
| `persistence/mongo-store.provider.ts` | `BaseStore`, per-user namespace (§5, §4.3) |
| `system-prompt.ts` | Prompt constant |
| `tools/catalog.ts` | Shared catalog + LangChain adapter (§7) |
| `schemas/ai-conversation.schema.ts` | `threadId → userId` ownership (§4.2) |

**Web** — new `apps/web/src/features/assistant/`
`chat-view.tsx`, `use-agent.ts` (`HttpAgent` + event subscription), `approval-card.tsx`
(approve / edit / cancel), route under `(app)/`. Optionally a memory viewer in Settings (§6).

**Deps** — API: `deepagents`, `@langchain/core`, `@langchain/langgraph`, `@langchain/openai`,
`@ag-ui/core`, `@ag-ui/encoder`, Mongo checkpointer/store packages. Web: `@ag-ui/client`.
**Config**: `OPENAI_API_KEY`.

---

## 13. Cost and abuse control

An authenticated but free LLM endpoint is an unbounded cost surface, and an agent loop issues
many model calls per user turn.

- `@Throttle()` on the run endpoint, tighter than the global 100/min.
- Per-user daily token ceiling, checked before the run.
- Log usage per run so cost per active user is measured, not inferred.
- Cap `recursionLimit` so a confused loop terminates.

---

## 14. Testing (§80)

- **Tool handlers**: unit tests over mocked services — pure functions of `(args, config)`. Existing MCP tool specs are the template.
- **The §36 test, most valuable here**: a run proposing a write leaves the database untouched and emits a tool call with no result; only `approve` creates the record. `reject` creates nothing; `edit` writes the *edited* values, not the proposed ones.
- **Thread ownership**: user B resuming user A's `threadId` is rejected.
- **Store namespacing**: user A writes `/memories/x`; user B's agent cannot read it. Same class of test as thread ownership, and just as easy to get wrong.
- **History injection**: a request with fabricated prior messages must not influence the run (§4.4).
- **Durability**: a pending approval survives a process restart; a memory written in thread 1 is readable in thread 2.
- **AG-UI conformance**: event ordering, and every run terminating with `RUN_FINISHED`/`RUN_ERROR` — malformed streams fail client-side in ways that are hard to trace back.
- **Do not** assert on model output text. That tests the model, not Pocketly, and it will flake.

---

## 15. Phasing

**Phase 0 — shared tool catalog**, split read/write for `interruptOn`. MCP e2e green, no behavior change.

**Phase 1 — read-only assistant over AG-UI.** Agent, Mongo checkpointer, read tools, adapter happy path, chat UI. **Ships acceptance criterion 13** and is independently useful.

**Phase 2 — HITL writes.** `interruptOn`, interrupt↔tool-call mapping, approval card. **Ships 14–16 and closes the MVP.**

**Phase 3 — memory.** Mongo store, `CompositeBackend`, per-user namespacing, memory viewer. Deliberately last: it is the only piece with no acceptance criterion behind it, and it carries the poisoning risk in §6.

**Phase 4 — polish.** Token ceilings, `STATE_*` plan view, analysis subagent, prompt tuning against real transcripts.

---

## 16. To verify before building

None of this is surface I have run; each would change code if wrong.

1. **`deepagents` JS parity** — `createDeepAgent`, `interruptOn`, `Command` resume, `CompositeBackend`/`StoreBackend` all current in the TS build.
2. **Mongo checkpointer for JS** — package exists and is maintained.
3. **Mongo `BaseStore` for JS** — likely the gap; if absent, implement over Mongoose (§5).
4. **Runtime config in tools** — how a LangChain JS tool handler reads `configurable.userId` (§4.1 depends on it).
5. **Store namespace plumbing** — how `StoreBackend` derives its namespace, and whether per-user namespacing needs a custom backend wrapper (§4.3 depends on it).
6. **Interrupt payload shape** — exact structure of `__interrupt__` / `getState().next`.
7. **Streaming + interrupts** — how a mid-stream interrupt surfaces in LangGraph's stream API.
8. **`HttpAgent` custom headers** and the exact `RunAgentInput` shape Nest must accept.

---

## 17. Open questions for you

1. **OpenAI model choice** — which model, and is there a cost ceiling that should shape it? Drives §13 and possibly which effort/verbosity settings apply.
2. **§58 deviation** — one AG-UI endpoint instead of three (§8). My recommendation; needs your sign-off since it edits the spec.
3. **Write scope for Phase 2** — transactions only is my recommendation; budgets and categories stay read-only until transactions prove out.
4. **Mongo store fallback** — if no JS package exists, is a hand-rolled `BaseStore` over Mongoose acceptable, or would you rather add Postgres/Redis?
5. **`requirement.md` is stale** — §7/§8/§45/§52/§82/§85 still specify Better Auth; §44–46 still treat the deprecated mobile app as a requirement; §58 needs the endpoint amendment; and there is no memory requirement at all to point at.
