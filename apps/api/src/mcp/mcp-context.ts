import { AccountsService } from '../accounts/accounts.service';
import { AnalysisService } from '../analysis/analysis.service';
import { BudgetsService } from '../budgets/budgets.service';
import { CategoriesService } from '../categories/categories.service';
import { TransactionsService } from '../transactions/transactions.service';
import { UserDocument } from '../users/schemas/user.schema';
import {
  getMcpResourceClientActions,
  mcpIssuer,
  mcpJwksUrl,
  mcpResourceUri,
} from '../auth/auth.config';

export type McpScope = 'pocketly:read' | 'pocketly:write';

export interface McpToolServices {
  accounts: AccountsService;
  transactions: TransactionsService;
  budgets: BudgetsService;
  categories: CategoriesService;
  analysis: AnalysisService;
}

export interface McpToolContext {
  user: UserDocument;
  token: string;
  services: McpToolServices;
}

/**
 * Re-verifies the access token against a specific scope right before a tool
 * acts on it. Delegates to the OAuth provider's own scope-matching logic
 * (rather than hand-parsing the JWT's scope claim) -- cheap since
 * verification is local (JWT + JWKS), no database round trip.
 *
 * Returns a plain result instead of throwing so tool handlers can turn it
 * directly into an `isError` MCP result with a client-facing message.
 */
export async function requireScope(
  token: string,
  scope: McpScope,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const payload = await getMcpResourceClientActions()
    .verifyAccessToken(token, {
      verifyOptions: { audience: mcpResourceUri, issuer: mcpIssuer },
      scopes: [scope],
      jwksUrl: mcpJwksUrl,
    })
    .catch(() => null);
  if (!payload) {
    return {
      ok: false,
      message: `This action requires the "${scope}" scope, which wasn't granted to this connection.`,
    };
  }
  return { ok: true };
}
