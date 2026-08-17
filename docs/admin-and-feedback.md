# Admin Panel, Permissions & Feedback Workflow

## 1. Overview

Pocketly includes an **admin-only platform operations dashboard** and a **community feedback & feature roadmap system**. This ensures that:
1. Administrators have visibility into platform health, user growth, aggregate feature adoption, and operational signals without violating user financial privacy.
2. Users can submit feedback, report bugs, and vote on feature ideas directly within the application.
3. Strict server-side authorization boundaries guarantee non-admin users cannot access administrative APIs, platform metrics, or internal notes.

---

## 2. Admin Permissions & Authorization Model

### Role Model
- Users have a `role` field on their profile: `'user' | 'admin'` (default: `'user'`).
- Initial administrators can be configured using the `ADMIN_EMAILS` environment variable (comma-separated email list). When a user signs in or creates a profile with an email in this list, they are automatically granted `admin` privileges.
- Existing administrators can promote/demote users from the **User Directory** tab in the Admin panel.

### Server-Side Authorization Boundary
- Admin endpoints under `/admin/*` are strictly guarded by `AdminGuard` / `@AdminOnly()`.
- If an unauthenticated user calls an admin endpoint, a `401 Unauthorized` is thrown.
- If an authenticated user with `role === 'user'` calls an admin endpoint, a `403 Forbidden ('Admin access required')` is thrown.
- The web app `/admin` route enforces server-side permission checks during SSR/Server Component evaluation and displays a 403 Forbidden screen to unauthorized users.
- The sidebar dynamically reveals the "Admin Panel" link only to users with `role: 'admin'`.

### Audit Trail
- All sensitive admin operations (status changes, team internal notes, feedback deletions, and user role updates) are recorded in the `AdminAuditLog` collection with timestamp, administrator ID/email, target, and IP address.

---

## 3. Feedback & Feature Requests Workflow

### Lifecycle States
Feature requests and feedback transition through 6 distinct stages:
1. **Submitted**: Newly submitted idea or bug report from a user.
2. **Under Review**: Product team is evaluating feasibility and impact.
3. **Planned**: Accepted into the product backlog and scheduled for future sprints.
4. **In Progress**: Currently under active design/engineering.
5. **Shipped**: Feature released to production or bug resolved.
6. **Declined / Rejected**: Idea evaluated but not aligning with product roadmap.

### Community Upvoting & Privacy
- Users can browse the community roadmap, search ideas, and toggle upvotes on feature suggestions.
- Internal administrative notes (`internalNotes`) are strictly omitted in user-facing endpoints (`/feedback`) and only exposed to administrators via `/admin/feedback`.
- Public team responses (`adminResponse`) are visible to all users on the roadmap board to communicate progress.
- Users can delete only their own submitted feedback; administrators can moderate/delete any submission.

---

## 4. Platform Analytics & Privacy Guarantees

The admin analytics aggregation pipeline in `AdminAnalyticsService` aggregates platform metrics directly via MongoDB aggregation:
- **User Growth & Retention Signals**: Daily signup volume and 7-day/30-day active user activity.
- **Aggregated Financial Flow**: Monthly anonymized inflow and outflow totals across the platform (no individual accounts, merchant names, or financial PII exposed).
- **Feature Adoption Rates**: Percentage of registered users using Accounts, Budgets, Goals, Recurrences, Money Rules, and MCP AI connections.
