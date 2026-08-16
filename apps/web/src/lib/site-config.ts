function resolveSiteUrl(): string {
  const customUrl =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (customUrl) {
    return customUrl.replace(/\/$/, "");
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();

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
