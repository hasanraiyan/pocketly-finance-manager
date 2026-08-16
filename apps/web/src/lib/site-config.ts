/**
 * Falls back to localhost in dev. Set NEXT_PUBLIC_SITE_URL to the real
 * production domain once Pocketly is deployed -- metadataBase, canonical
 * URLs, the sitemap, and robots.txt all derive from this.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export const SITE_NAME = "Pocketly";

export const SITE_DESCRIPTION =
  "Pocketly is a personal finance ledger: track accounts, log income and expenses in seconds, set budgets per category, and see your spending patterns without a spreadsheet.";

const apiAuthUrl =
  process.env.NEXT_PUBLIC_API_AUTH_URL ?? "http://localhost:4000/api/auth";

/** The MCP endpoint URL to hand to an AI client -- see auth.config.ts's mcpResourceUri (the API mounts /mcp as a sibling of /api/auth, both off the same origin). */
export const MCP_SERVER_URL = apiAuthUrl.replace(/\/api\/auth\/?$/, "/mcp");

export const SITE_KEYWORDS = [
  "personal finance app",
  "expense tracker",
  "budgeting app",
  "money management app",
  "budget planner",
  "income and expense tracker",
  "personal ledger app",
  "spending tracker",
];
