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

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/**
 * The MCP endpoint URL to hand to an AI client. The API mounts /mcp at its
 * own origin root (outside the api/v1 prefix), because MCP clients address it
 * as the canonical resource URI advertised in the protected-resource metadata.
 */
export const MCP_SERVER_URL = apiUrl.replace(/\/api\/v1\/?$/, "/mcp");

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
