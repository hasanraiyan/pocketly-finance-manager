Absolutely. I’d rewrite it as the **actual engineering SRS for the standalone Pocketly product**, with **Clerk, MongoDB, Next.js, TypeScript, Zod, Expo/React Native, AI, MCP, Telegram, and the existing Pocketly functionality** treated as first-class parts of the architecture.

I’d also remove the unnecessary custom-auth requirements from the previous version.

# Pocketly — Software Requirements Specification

**Version:** 1.0
**Status:** Draft — Standalone Product
**Date:** August 16, 2026
**Product:** Pocketly
**Document:** Software Requirements Specification (SRS)

---

# 1. Introduction

## 1.1 Purpose

Pocketly is a personal finance management application designed to help users **track, understand, and improve their personal finances**.

Pocketly currently exists as a finance application embedded inside the `hasanraiyan/resume` portfolio application.

The objective of this project is to extract Pocketly from the portfolio and develop it as a **fully independent product** with:

* Its own application
* Its own authentication
* Its own database
* Its own API
* Its own web experience
* Mobile support
* AI-powered financial assistance
* Notifications and integrations
* Secure multi-user data isolation

The existing Pocketly implementation will serve as the functional reference and starting point for the standalone product.

The goal is **not to blindly rewrite the application**. Existing business logic and functionality should be reused and improved wherever practical.

---

# 2. Product Vision

Pocketly should make personal finance tracking simple enough that users actually continue doing it.

The core product loop is:

```text
                    ┌──────────────┐
                    │    Earn      │
                    └──────┬───────┘
                           ↓
                    ┌──────────────┐
                    │    Record    │
                    └──────┬───────┘
                           ↓
                    ┌──────────────┐
                    │  Understand  │
                    └──────┬───────┘
                           ↓
                    ┌──────────────┐
                    │     Plan     │
                    └──────┬───────┘
                           ↓
                    ┌──────────────┐
                    │   Improve    │
                    └──────┬───────┘
                           │
                           └──────→ Repeat
```

Pocketly should not feel like traditional accounting software.

It should feel like a **modern personal money companion**.

---

# 3. Product Goals

## 3.1 Primary Goals

Pocketly MUST allow users to:

1. Track income.
2. Track expenses.
3. Track transfers between accounts.
4. Manage financial accounts.
5. Manage categories.
6. Create budgets.
7. Analyze financial activity.
8. Search and filter transactions.
9. Understand current financial position.
10. Export financial information.
11. Ask an AI assistant questions about their finances.
12. Access their finances from supported devices.
13. Receive useful reminders.

---

# 4. Non-Goals

The initial product will NOT attempt to become a complete financial ecosystem.

The following are outside the MVP:

* Stock trading
* Cryptocurrency trading
* Tax filing
* Loan marketplace
* Insurance marketplace
* Credit score monitoring
* Business accounting
* Payroll
* Full accounting/bookkeeping
* Direct bank aggregation
* Automated investment management

These may be considered in future versions.

---

# 5. Target Users

## 5.1 Primary Users

Pocketly is primarily intended for individuals managing their personal finances.

Examples:

* Students
* Young professionals
* Developers
* Freelancers
* Creators
* Entrepreneurs
* People managing multiple bank/wallet accounts

## 5.2 Typical User

A typical user should be able to open Pocketly after spending money and record:

```text
₹250
Food
HDFC Bank
Dinner
```

in only a few seconds.

---

# 6. Technology Stack

The initial standalone application will use the following technologies.

| Layer            | Technology           |
| ---------------- | -------------------- |
| Web              | Next.js              |
| Language         | TypeScript           |
| UI               | React                |
| Styling          | Tailwind CSS         |
| Components       | shadcn/ui            |
| Authentication   | **Clerk**            |
| Database         | MongoDB              |
| ODM              | Mongoose             |
| Validation       | Zod                  |
| Web hosting      | Vercel               |
| Mobile           | Expo / React Native  |
| AI               | Provider abstraction |
| AI protocol      | MCP                  |
| Notifications    | Telegram initially   |
| Error monitoring | Sentry               |
| Package manager  | pnpm                 |

The architecture should remain flexible enough to replace individual infrastructure components later.

---

# 7. Authentication

## 7.1 Clerk

Pocketly MUST use **Clerk** as its identity provider.

Pocketly MUST NOT hand-roll:

* Password hashing
* Session/token issuance
* OAuth provider implementation (used for MCP client authorization)

Clerk handles identity, session issuance, email verification, password reset, social sign-in, and
the OAuth authorization server that MCP clients authenticate against. Pocketly's own code only
reads the resulting session — it never re-implements auth primitives itself.

Integration points:

* API — `@clerk/express`: `clerkMiddleware()` plus a global `ClerkAuthGuard`.
* Web — `@clerk/nextjs`: `ClerkProvider`, `clerkMiddleware()` in `src/proxy.ts`, and Clerk's prebuilt sign-in/sign-up components.
* Sync — `POST /webhooks/clerk` (Svix-verified) keeps the Pocketly profile aligned on `user.updated` / `user.deleted`.

Earlier revisions of this document specified Better Auth, self-hosted inside the API. It was
replaced by Clerk; see `docs/clerk-migration-plan.md` for the migration and its consequences —
notably §37's scope limitation, which is a direct result of this choice.

---

# 8. Clerk User Identity

Every Pocketly user MUST be associated with a Clerk user.

Example:

```text
Clerk
  │
  │ authUserId
  ↓
Pocketly User
```

The Pocketly database SHOULD maintain a lightweight user/profile record.

```text
User
├── id
├── authUserId
├── email
├── name
├── imageUrl
├── currency
├── timezone
├── createdAt
└── updatedAt
```

`authUserId` MUST be unique.

---

# 9. Authorization

Authentication and authorization are separate concerns.

Clerk answers:

> Who is this user?

Pocketly answers:

> What data is this user allowed to access?

Every Pocketly financial resource MUST belong to a specific user.

For example:

```text
Transaction
├── id
├── userId
├── amount
├── type
└── ...
```

The backend MUST verify:

```text
authenticated Clerk user
        ↓
Pocketly user
        ↓
resource.userId === currentUser.id
```

A user MUST NEVER be able to access another user's:

* Accounts
* Transactions
* Categories
* Budgets
* Connections
* Reminder settings
* Exports

---

# 10. Existing Pocketly Functionality

The current Pocketly application already contains substantial functionality.

The standalone product should preserve and improve:

* Accounts
* Records
* Analysis
* Planning
* AI Chat
* Settings
* Transaction management
* Transfers
* Budgets
* Categories
* PDF exports
* Telegram integration
* Reminders
* Mobile connectivity
* MCP functionality

The existing Pocketly implementation should be treated as the **functional baseline**.

---

# 11. Application Structure

The primary application navigation will be:

```text
Pocketly
│
├── Dashboard
├── Accounts
├── Records
├── Analysis
├── Planning
├── AI Assistant
└── Settings
```

The exact navigation can evolve during UX development.

---

# 12. Dashboard

The dashboard provides a high-level financial overview.

It SHOULD display:

* Total balance
* Current-period income
* Current-period expenses
* Net cash flow
* Budget status
* Recent transactions
* Important financial insights

Example:

```text
Total Balance
₹42,500

Income
₹25,000

Expenses
₹12,500

Net
+₹12,500
```

The dashboard MUST load quickly and avoid unnecessary network requests.

---

# 13. Accounts

An account represents a location where money is stored.

Examples:

* Bank account
* Cash
* Savings account
* UPI wallet
* Credit card
* Digital wallet

## 13.1 Account Requirements

Users MUST be able to:

* Create accounts
* Edit accounts
* Archive accounts
* View balances
* View account transactions

Account fields:

```text
Account
├── id
├── userId
├── name
├── type
├── icon
├── initialBalance
├── currency
├── ignored
├── deletedAt
├── createdAt
└── updatedAt
```

---

# 14. Account Balance

Current balance MUST be calculated accurately.

Conceptually:

```text
Current Balance
=
Initial Balance
+ Income
- Expenses
+ Transfers In
- Transfers Out
```

Transfers MUST NOT be counted as income or expenses.

---

# 15. Transactions

Transactions are the core financial entity.

Pocketly MUST support:

```text
Expense
Income
Transfer
```

---

# 16. Expense

An expense represents money leaving an account.

Example:

```text
₹500
Food
Dinner
HDFC Bank
```

---

# 17. Income

An income transaction represents money entering an account.

Example:

```text
₹20,000
Salary
Salary
HDFC Bank
```

---

# 18. Transfer

A transfer represents money moving between two accounts.

Example:

```text
₹5,000

HDFC Bank
      ↓
Savings
```

Transfers MUST NOT affect overall net income/expense calculations.

---

# 19. Transaction Data Model

```text
Transaction
├── id
├── userId
├── type
├── amount
├── description
├── categoryId
├── accountId
├── toAccountId
├── date
├── note
├── deletedAt
├── syncVersion
├── createdAt
└── updatedAt
```

---

# 20. Transaction Creation

Users MUST be able to create transactions.

Required:

* Type
* Amount
* Account
* Date

Optional:

* Category
* Description
* Note

Transfers additionally require:

* Source account
* Destination account

---

# 21. Fast Transaction Entry

Transaction creation is one of Pocketly's most important interactions.

The UX SHOULD optimize for:

> **Record an expense in under 10 seconds.**

Recommended flow:

```text
+
 ↓
Amount
 ↓
Category
 ↓
Account
 ↓
Save
```

Pocketly SHOULD remember recent selections where appropriate.

---

# 22. Transaction Editing

Users MUST be able to:

* Edit transactions
* Delete transactions
* Undo recent deletion

Soft deletion SHOULD be used.

```text
deletedAt
```

Deleted transactions should not appear in normal application queries.

---

# 23. Transaction Search

Users MUST be able to search transactions.

Search SHOULD support:

* Description
* Notes

---

# 24. Transaction Filters

Users SHOULD be able to filter by:

* Income
* Expense
* Transfer
* Account
* Category
* Date
* Date range

---

# 25. Transaction Pagination

The system MUST NOT load an unlimited transaction history into the browser.

Large transaction sets MUST use:

* Pagination
* Cursor-based loading
* Or virtualized/incremental loading

---

# 26. Categories

Categories organize transactions.

Example expense categories:

```text
Food
Travel
Shopping
Education
Entertainment
Bills
Health
```

Example income categories:

```text
Salary
Freelance
Business
Gift
Other
```

---

# 27. Category Data Model

```text
Category
├── id
├── userId
├── name
├── type
├── icon
├── color
├── ignored
├── deletedAt
├── createdAt
└── updatedAt
```

Users MUST be able to:

* Create categories
* Edit categories
* Archive categories
* Delete categories where safe

---

# 28. Budgets

Budgets allow users to define spending limits.

Supported periods:

```text
Weekly
Monthly
Yearly
```

Example:

```text
Food
Budget: ₹5,000/month
Spent: ₹3,200
Remaining: ₹1,800
```

---

# 29. Budget Data Model

```text
Budget
├── id
├── userId
├── categoryId
├── amount
├── period
├── deletedAt
├── syncVersion
├── createdAt
└── updatedAt
```

---

# 30. Budget Calculations

The system MUST calculate:

* Budget amount
* Amount spent
* Remaining amount
* Percentage used

Example:

```text
Budget = ₹5,000
Spent = ₹4,000

Used = 80%
Remaining = ₹1,000
```

The UI SHOULD warn users when approaching a limit.

The UI MUST clearly indicate when a budget has been exceeded.

---

# 31. Financial Analysis

Pocketly MUST provide financial analysis.

Required analysis:

### Spending

* Total expenses
* Category breakdown
* Top categories

### Income

* Total income
* Income sources
* Category breakdown

### Cash Flow

* Daily income
* Daily expenses
* Net flow

### Accounts

* Account balances
* Account activity
* Income by account
* Expenses by account

---

# 32. Analysis Periods

The user SHOULD be able to select:

```text
Last 7 days
This month
Last month
3 months
6 months
This year
Custom range
```

The system MUST use consistent timezone handling when calculating date ranges.

---

# 33. AI Finance Assistant

AI is a major feature of Pocketly — delivered as **bring-your-own-model over MCP**, not as an
in-app chatbot.

Users MUST be able to interact with their financial information using natural language:

```text
How much did I spend this month?

What did I spend on food?

What's my biggest expense?

How much money do I have?

How much is left in my food budget?

Show me my expenses from last week.
```

They do this by connecting their own AI client (Claude, ChatGPT, or any MCP-compatible client) to
Pocketly's MCP server (§39). The user brings the model and pays for it through their own
subscription.

## 33.1 Why not an in-app assistant

An in-app chatbot was specified in earlier revisions of this document and deliberately dropped
(see `docs/ai-assistant-plan.md` for the full analysis). Two reasons:

* **Cost.** Pocketly would pay per token for every user, on a product with no revenue. The cost is
  unbounded and grows with adoption.
* **Duplication.** The MCP server already exposes the same tools over the same domain services, and
  the model on the user's side is better than one Pocketly would host.

Pocketly's inference cost under this architecture is **zero**.

## 33.2 What Pocketly is still responsible for

Choosing BYO-model does not outsource the requirements — §35–38 still bind the MCP tool surface:
the tools are the AI's only source of financial data, they enforce the same authorization as the
REST API, and they never expose one user's data to another.

---

# 34. AI Architecture

The AI layer SHOULD be separated from the core finance domain.

```text
Pocketly
    │
    ├── Finance Domain
    │
    └── AI Layer
           │
           ├── Context retrieval
           ├── Tool calling
           ├── Calculations
           └── Response generation
```

AI MUST consume structured Pocketly data rather than independently guessing financial information.

---

# 35. AI Read Operations

AI SHOULD have tools for:

```text
getFinancialOverview
getAccounts
getTransactions
getCategories
getBudgets
getAnalysis
```

AI can use these tools to answer questions.

---

# 36. AI Write Operations

AI MAY support:

```text
createTransaction
updateTransaction
deleteTransaction
createBudget
updateBudget
```

However:

> **AI MUST NEVER silently modify financial data.**

The required flow is:

```text
User request
     ↓
AI interprets request
     ↓
AI generates proposed action
     ↓
User confirmation          ← rendered by the MCP client, not by Pocketly
     ↓
Pocketly API
     ↓
Database
     ↓
Confirmation
```

---

# 37. AI Transaction Confirmation

Example:

```text
You want to add:

Expense
₹350
Food
HDFC Bank
"Lunch"

[ Cancel ] [ Confirm ]
```

Only after confirmation should the transaction be created.

**Where this happens.** Under the BYO-model architecture (§33) the confirmation prompt is rendered
by the user's AI client, which asks before invoking a write tool. Pocketly does not render it, and
therefore cannot guarantee it: a client that chose not to prompt would not be blocked by the
server.

What Pocketly guarantees instead:

* Every write is attributable to a connection the user explicitly authorized (§39, §60).
* Connections are listed in Settings, and disconnecting takes effect immediately — including for
  access tokens already issued.
* Write tools are described so that a client understands they mutate data.

**Known limitation.** Pocketly's authorization provider does not yet support custom OAuth scopes,
so a connection is all-or-nothing read **and** write; a read-only connection cannot currently be
offered. This MUST be stated plainly wherever a user connects a client. See `docs/security.md`.

---

# 38. AI Accuracy

The AI MUST NOT invent:

* Account balances
* Transaction amounts
* Spending statistics
* Budget status

When financial information is requested, the system SHOULD retrieve current application data first.

---

# 39. MCP

Pocketly SHOULD provide an MCP interface.

Tools:

```text
manage_transaction  -- action: list | get | create | update | delete
manage_account      -- action: list | get | create | update | delete
manage_category     -- action: list | get | create | update | delete
manage_budget       -- action: list | get | create | update | delete

get_analysis
get_financial_overview
```

MCP requests MUST authenticate the user.

MCP MUST enforce the same authorization rules as the main API.

MCP MUST NOT become an alternative way to bypass Pocketly authorization.

---

# 40. Export

Users MUST be able to export their financial information.

## MVP

PDF export.

Supported ranges:

```text
Last 7 Days
This Month
Last Month
All Time
Custom Range
```

PDF SHOULD contain:

* Financial summary
* Daily financial trends
* Category breakdown
* Transaction table

---

# 41. Future Export Formats

Architecture SHOULD allow:

```text
CSV
JSON
Excel
```

in future versions.

---

# 42. Telegram Integration

Pocketly SHOULD support Telegram.

Potential capabilities:

* Telegram connection
* Financial reminders
* PDF report delivery
* Future notification workflows

Telegram credentials MUST be stored securely.

Users MUST be able to disconnect Telegram.

---

# 43. Reminders

Pocketly SHOULD provide optional transaction reminders.

Example:

> "You haven't recorded any transactions today. Would you like to update Pocketly?"

Users SHOULD control:

* Enable/disable
* Reminder time
* Timezone
* Reminder behavior

Possible modes:

```text
Only when no transaction exists
Always
```

---

# 44. Mobile Application

> **⚠️ DEPRECATED — the Expo app is not being developed.**
>
> Mobile access is delivered by the **responsive web application** (§70), which is what acceptance
> criterion 18 requires. `apps/mobile` still exists in the repository but is excluded from the dev
> loop (`turbo run dev --filter=!mobile`) and is not maintained.
>
> §44–46 are kept for reference in case a native app is revived. Everything in them describes work
> that is **not** in scope.

Pocketly SHOULD have an official mobile application.

Recommended technology:

**Expo + React Native**

The mobile application should provide:

* Authentication through Clerk
* Dashboard
* Accounts
* Transactions
* Categories
* Budgets
* Analysis
* AI assistant
* Notifications

---

# 45. Mobile Authentication

The mobile application MUST use Clerk-supported authentication mechanisms.

Pocketly MUST NOT implement an insecure custom authentication system merely for mobile.

Any Pocketly API session/token used by mobile clients MUST be:

* Secure
* Revocable
* Expirable
* Scoped appropriately

---

# 46. Synchronization

The system SHOULD support synchronization between:

```text
Web
 ↓
Pocketly API
 ↓
Database
 ↑
Pocketly Mobile
```

The server should remain authoritative.

Future versions MAY support:

* Offline transactions
* Sync queues
* Conflict resolution

---

# 47. Database

The initial standalone application will use:

**MongoDB + Mongoose**

The existing Pocketly implementation already uses Mongoose-based models.

The database layer SHOULD remain isolated behind a repository/service layer so that database technology can be changed later if necessary.

---

# 48. Data Ownership

Every financial record MUST be associated with a Pocketly user.

Example:

```text
User
 │
 ├── Accounts
 │
 ├── Categories
 │
 ├── Transactions
 │
 ├── Budgets
 │
 ├── AI Conversations
 │
 ├── Connections
 │
 └── Reminder Settings
```

---

# 49. Monetary Data

Financial amounts MUST NOT rely on unsafe floating-point calculations.

Preferred approaches:

### Option A

Store monetary values as integer minor units.

```text
₹100.50
↓
10050 paise
```

### Option B

Use a database Decimal type.

The final approach MUST be standardized across the application.

---

# 50. Validation

Pocketly MUST use **Zod** for request validation.

Validation MUST happen at the API boundary.

Validation should include:

* Amount
* Transaction type
* Account IDs
* Category IDs
* Dates
* Budget periods
* Required fields
* Ownership

Invalid requests MUST be rejected before reaching business logic.

---

# 51. API Architecture

The API SHOULD be versioned.

```text
/api/v1
```

---

# 52. Authentication API

Clerk hosts authentication. Pocketly exposes **no** authentication endpoints of its own — there is
no `/api/auth/*` route tree. Sign-up, sign-in, email verification, password reset, social sign-in
and session management all happen against Clerk, through its components in the web app.

The API's only auth-related routes are:

```text
POST /webhooks/clerk    Clerk → Pocketly profile sync (Svix-verified, @Public())
```

Authenticated requests to `/api/v1` arrive with a Clerk session token in
`Authorization: Bearer`. `clerkMiddleware()` verifies it and `ClerkAuthGuard` resolves it to a
Pocketly `User`. Pocketly's own route tree never re-implements any auth primitive; it only reads
the session Clerk has already resolved.

The backend resolves:

```text
Clerk user
    ↓
Pocketly user
```

---

# 53. Account API

```text
GET    /api/v1/accounts
POST   /api/v1/accounts
GET    /api/v1/accounts/:id
PATCH  /api/v1/accounts/:id
DELETE /api/v1/accounts/:id
```

---

# 54. Transaction API

```text
GET    /api/v1/transactions
POST   /api/v1/transactions
GET    /api/v1/transactions/:id
PATCH  /api/v1/transactions/:id
DELETE /api/v1/transactions/:id
```

---

# 55. Category API

```text
GET    /api/v1/categories
POST   /api/v1/categories
PATCH  /api/v1/categories/:id
DELETE /api/v1/categories/:id
```

---

# 56. Budget API

```text
GET    /api/v1/budgets
POST   /api/v1/budgets
PATCH  /api/v1/budgets/:id
DELETE /api/v1/budgets/:id
```

---

# 57. Analysis API

```text
GET /api/v1/analysis
GET /api/v1/analysis/categories
GET /api/v1/analysis/cash-flow
GET /api/v1/analysis/accounts
```

---

# 58. AI API

**Removed.** These endpoints described an in-app assistant and were never built; see §33.1.

```text
POST /api/v1/ai/chat              ✗ not implemented — superseded by MCP
POST /api/v1/ai/action/preview    ✗ not implemented — superseded by MCP
POST /api/v1/ai/action/confirm    ✗ not implemented — superseded by MCP
```

The AI surface is the MCP server (§39) plus the Connection API (§60):

```text
POST   /mcp                                        MCP transport (OAuth bearer token)
GET    /.well-known/oauth-protected-resource       discovery → authorization server
GET    /api/v1/mcp-connections                     list connected clients
DELETE /api/v1/mcp-connections/{clientId}          disconnect, effective immediately
```

---

# 59. Export API

```text
POST /api/v1/exports/pdf
POST /api/v1/exports/csv
```

CSV can remain future functionality.

---

# 60. Connection API

```text
GET    /api/v1/connections
POST   /api/v1/connections
DELETE /api/v1/connections/:id
```

---

# 61. Security

Security is a critical requirement because Pocketly handles sensitive financial information.

The application MUST:

* Use HTTPS in production.
* Use Clerk for authentication.
* Validate authorization on every protected request.
* Validate all input.
* Avoid logging financial information unnecessarily.
* Avoid logging authentication credentials.
* Secure third-party tokens.
* Rate-limit sensitive endpoints.
* Protect AI write operations.
* Prevent cross-user data access.

---

# 62. Rate Limiting

Rate limiting SHOULD be implemented for:

* AI requests
* Authentication-related requests
* Export generation
* API requests
* MCP requests

AI endpoints SHOULD have additional usage limits to control cost.

---

# 63. Privacy

Pocketly MUST clearly explain:

* What data is stored.
* Why it is stored.
* How financial data is processed.
* How AI interacts with financial data.
* What Telegram receives.
* What data is sent to external AI providers.
* How users can export data.
* How users can delete data.

---

# 64. Account Deletion

Users MUST be able to delete their Pocketly account.

Deletion flow:

```text
User requests deletion
        ↓
Confirmation
        ↓
Revoke connections
        ↓
Delete/anonymize Pocketly data
        ↓
Delete Pocketly profile
        ↓
Clerk identity deletion (clerkClient.users.deleteUser)
```

The exact deletion strategy should comply with the selected data-retention policy.

---

# 65. Soft Deletion

Financial entities SHOULD support:

```text
deletedAt
```

This applies to:

* Transactions
* Accounts
* Categories
* Budgets

Normal queries MUST exclude deleted records.

---

# 66. Data Backup

Production databases MUST have automated backups.

Requirements:

* Scheduled backups
* Retention policy
* Recovery process
* Recovery testing

---

# 67. Error Monitoring

Pocketly SHOULD use **Sentry** for application error monitoring.

Monitoring should cover:

* Frontend errors
* API errors
* Background jobs
* AI failures
* Mobile crashes where supported

Sensitive financial information MUST NOT be unnecessarily included in error reports.

---

# 68. Background Jobs

Background processing may be required for:

* Telegram reminders
* Report generation
* Notifications
* Scheduled maintenance
* Future recurring transactions

The architecture SHOULD keep background jobs separate from synchronous user requests.

---

# 69. Performance

## Web

The application SHOULD become interactive within approximately:

**2 seconds**

under normal conditions.

## API

Typical CRUD requests SHOULD target:

**<500 ms**

under normal system load.

## Database

Queries MUST use appropriate indexes.

Likely indexes include:

```text
userId
userId + date
userId + accountId
userId + categoryId
userId + deletedAt
```

---

# 70. Responsive Design

Pocketly MUST support:

* Desktop
* Tablet
* Mobile

Mobile must be treated as a first-class experience.

The interface should not simply shrink the desktop layout.

---

# 71. Design Language

The existing Pocketly visual identity should remain the starting point.

Primary visual direction:

```text
Warm off-white
+
Deep green
+
Soft neutral surfaces
+
Minimal financial UI
```

The existing Pocketly design system can be extracted into the standalone application's shared UI package.

---

# 72. UI States

Every asynchronous interaction MUST support appropriate:

```text
Loading
Success
Empty
Error
Retry
```

Financial data should never disappear silently because of a failed request.

---

# 73. Empty States

Examples:

### No transactions

> No transactions yet.

Provide:

```text
Add your first transaction
```

### No budgets

> Create a budget to start tracking your spending.

### No accounts

> Add your first account.

Empty states should guide the user toward the next meaningful action.

---

# 74. Portfolio Separation

This is a major architectural requirement.

The portfolio MUST no longer host Pocketly's primary runtime.

Instead:

```text
hasanraiyan.me
      │
      └── Pocketly project page
                   │
                   └── Open Pocketly
                            │
                            ▼
                    Standalone Pocketly
```

The portfolio becomes a **marketing/project showcase**.

Pocketly becomes the actual product.

---

# 75. Migration from Existing Pocketly

The existing Pocketly data must be migrated carefully.

Migration should preserve:

* Accounts
* Transactions
* Categories
* Budgets
* Dates
* Amounts
* Notes
* Descriptions
* Relationships

Migration process:

```text
Existing Pocketly
       ↓
Extract data
       ↓
Create Clerk user mapping
       ↓
Create Pocketly user
       ↓
Assign financial records
       ↓
Validate references
       ↓
Validate balances
       ↓
Validate transaction counts
       ↓
Production database
```

Financial balances MUST be reconciled after migration.

---

# 76. Existing Admin Authentication Migration

The current portfolio implementation uses an admin-oriented authentication model.

The standalone application MUST remove this dependency.

New model:

```text
Old

Admin
  ↓
Pocketly


New

Clerk User
  ↓
Pocketly User
  ↓
User-owned financial data
```

There should be no concept of a single portfolio administrator controlling all Pocketly financial data.

---

# 77. Project Structure

Recommended initial structure:

```text
pocketly/
│
├── apps/
│   ├── web/
│   └── mobile/
│
├── packages/
│   ├── ui/
│   ├── types/
│   ├── validation/
│   └── finance-core/
│
├── packages/server/
│   ├── accounts/
│   ├── transactions/
│   ├── categories/
│   ├── budgets/
│   ├── analysis/
│   ├── ai/
│   ├── exports/
│   └── connections/
│
├── docs/
│   ├── SRS.md
│   ├── architecture.md
│   ├── security.md
│   └── api.md
│
├── package.json
└── pnpm-workspace.yaml
```

A monorepo is preferred if web and mobile share substantial code.

---

# 78. Domain Architecture

The finance domain SHOULD remain independent of the UI.

```text
UI
 ↓
API
 ↓
Application Services
 ↓
Finance Domain
 ↓
Repositories
 ↓
MongoDB
```

For example:

```text
createTransaction()
        ↓
validateTransaction()
        ↓
verifyOwnership()
        ↓
calculateEffects()
        ↓
TransactionRepository
        ↓
MongoDB
```

This makes the financial logic reusable by:

* Web
* Mobile
* AI
* MCP
* Background jobs

---

# 79. AI Architecture

AI should consume the same domain services as the normal application.

```text
                  ┌─────────────┐
                  │ Web / Mobile│
                  └──────┬──────┘
                         │
                  ┌──────▼──────┐
                  │ Finance API │
                  └──────┬──────┘
                         │
                 ┌───────▼────────┐
                 │ Finance Domain │
                 └───────▲────────┘
                         │
                  ┌──────┴───────┐
                  │ AI / MCP      │
                  └──────────────┘
```

AI should never directly manipulate the database.

---

# 80. Testing Requirements

The application MUST have automated tests for critical financial logic.

## Unit Tests

Required for:

* Balance calculation
* Transaction validation
* Transfer logic
* Budget calculation
* Date-range calculations
* Category aggregation
* Cash-flow calculations

## Integration Tests

Required for:

* Authentication → API
* Transaction creation
* Transaction editing
* Transaction deletion
* Budget creation
* Ownership enforcement

## End-to-End Tests

Critical flows:

```text
Sign in
 ↓
Create account
 ↓
Create transaction
 ↓
View transaction
 ↓
View updated balance
```

And:

```text
Create budget
 ↓
Create expense
 ↓
Budget updates
```

---

# 81. Financial Correctness

Financial correctness has higher priority than UI polish.

For example:

If:

```text
Initial balance = ₹10,000

Income = ₹5,000

Expense = ₹2,000

Transfer in = ₹1,000

Transfer out = ₹500
```

then:

```text
Balance = ₹13,500
```

The system MUST produce deterministic and testable results.

---

# 82. MVP

The standalone MVP MUST include:

### Authentication

* Clerk
* Protected routes
* User-specific authorization

### Finance

* Accounts
* Transactions
* Transfers
* Categories
* Budgets
* Dashboard
* Records
* Analysis

### AI

* MCP server — connect any MCP-compatible AI client (§33, §39)
* Read-only financial questions, through that client
* Transaction creation, confirmed in that client

### Utility

* PDF export
* Responsive web application

---

# 83. Post-MVP

The following should be added after the core product is stable:

### Phase 2

* Recurring transactions — see `docs/post-mvp-plan.md` Track A
* Rule-based insights — see `docs/post-mvp-plan.md` Track B
* Telegram reminders
* Telegram reports
* ~~Mobile app~~ — deprecated, see §44
* ~~Push notifications~~ — already shipped (web FCM)

### Phase 3

* Receipt scanning
* Voice transaction entry
* Financial goals
* Subscription tracking

Anything requiring paid inference (receipt scanning, auto-categorization, voice entry) is out of
scope while Pocketly has no revenue — see §33.1. Where a feature can be delivered as a tool on the
MCP server instead, the user's own AI client pays for it and Pocketly does not.

### Phase 4

* Bank integrations
* UPI integrations
* Investment tracking
* Advanced financial intelligence

---

# 84. Product Roadmap

```text
Phase 1
Standalone Core
│
├── Clerk
├── MongoDB
├── Accounts
├── Transactions
├── Categories
├── Budgets
├── Analysis
└── Export
        ↓
Phase 2
AI + Automation
│
├── AI Assistant
├── Transaction actions
├── Telegram
└── Reminders
        ↓
Phase 3
Mobile
│
├── Expo
├── Push notifications
├── Sync
└── Offline support
        ↓
Phase 4
Intelligence
│
├── Receipt scanning
├── Auto categorization
├── Goals
└── Predictions
```

---

# 85. Acceptance Criteria

Pocketly MVP is ready when a new user can:

1. Sign up through Clerk.
2. Sign in through Clerk.
3. Create a financial account.
4. Create an expense.
5. Create income.
6. Transfer money between accounts.
7. View updated balances.
8. Create categories.
9. Create budgets.
10. Search transactions.
11. Filter transactions.
12. View analysis.
13. Connect an AI client to Pocketly over MCP.
14. Ask that client about their finances and get answers from their real data.
15. Ask that client to record a transaction, and review what it proposes.
16. Confirm it, and see the record appear in Pocketly.
17. Export financial data.
18. Access the application on mobile web.
19. Never access another user's data.

Criteria 13–16 were rewritten when the in-app assistant was dropped in favour of MCP (§33.1).
Criterion 18 is satisfied by the responsive web application (§70); the Expo app is deprecated
(§44).

---

# 86. Definition of Done

A feature is considered complete when:

* Requirements are implemented.
* TypeScript types are defined.
* Zod validation exists.
* Authorization is enforced.
* Database queries are user-scoped.
* Error states exist.
* Loading states exist.
* Unit tests exist for important business logic.
* Integration tests exist for critical API behavior.
* UI is responsive.
* Errors are monitored.
* Documentation is updated.

---

# 87. Engineering Principles

## 87.1 Reuse Before Rewrite

Existing Pocketly functionality should be extracted and improved instead of unnecessarily rewritten.

## 87.2 Clerk Handles Identity

Pocketly does not implement its own authentication system.

## 87.3 Finance Domain Owns Financial Logic

Balance calculations and financial rules should not live inside React components.

## 87.4 AI Uses Tools

AI should retrieve actual Pocketly data rather than hallucinating financial information.

## 87.5 Explicit Confirmation for Financial Writes

No silent AI transaction creation.

## 87.6 User Owns Their Data

Users must be able to export and delete their information.

## 87.7 Security by Default

Every resource is private unless explicitly designed otherwise.

## 87.8 Simple Architecture First

Do not introduce unnecessary microservices.

Start with a modular application and extract services only when scale or operational requirements justify it.

---

# 88. Final Architecture

The initial production architecture should look approximately like this:

```text
                         ┌───────────────────┐
                         │    Pocketly Web   │
                         │      Next.js      │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │    Clerk    │
                         │ Authentication    │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │   Pocketly API    │
                         │   /api/v1         │
                         └─────────┬─────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
             ┌────────────┐ ┌────────────┐ ┌────────────┐
             │   Finance  │ │     AI     │ │ Background │
             │   Domain   │ │   Layer    │ │    Jobs    │
             └─────┬──────┘ └─────┬──────┘ └─────┬──────┘
                   │              │              │
                   └──────────────┼──────────────┘
                                  ▼
                         ┌───────────────────┐
                         │     MongoDB       │
                         │   Pocketly Data   │
                         └───────────────────┘

              ┌─────────────────────────────────┐
              │          External Systems       │
              │                                 │
              │ Telegram │ MCP │ AI Provider   │
              └─────────────────────────────────┘

                         ▲
                         │
                  ┌──────┴──────┐
                  │ Pocketly    │
                  │ Mobile App  │
                  │ Expo/RN     │
                  └─────────────┘
```

---

# 89. Final Product Definition

Pocketly is a **standalone personal finance application** that gives users a simple way to:

> **Track → Understand → Plan → Improve**

The existing portfolio implementation is the foundation.

The standalone product will transform it into a proper multi-user application by introducing:

```text
Existing Pocketly
       +
Clerk
       +
User-scoped authorization
       +
Standalone database
       +
Production API
       +
AI
       +
Mobile
       +
Notifications
       ↓
Standalone Pocketly
```

The most important architectural rule is:

> **Clerk owns identity. Pocketly owns financial data. The Finance Domain owns financial rules. AI interacts with the Finance Domain through authorized tools.**

That gives us a clean foundation without overengineering the first version.
