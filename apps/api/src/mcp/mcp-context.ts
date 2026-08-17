import { decodeJwt } from 'jose';
import { AccountsService } from '../accounts/accounts.service';
import { AnalysisService } from '../analysis/analysis.service';
import { BudgetsService } from '../budgets/budgets.service';
import { CategoriesService } from '../categories/categories.service';
import { TransactionsService } from '../transactions/transactions.service';
import { UserDocument } from '../users/schemas/user.schema';

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
 * Re-verifies the access token against a specific scope right before a tool acts on it.
 */
export function requireScope(
  token: string,
  scope: McpScope,
): { ok: true } | { ok: false; message: string } {
  try {
    const payload = decodeJwt(token);
    const scopes =
      typeof payload.scope === 'string' ? payload.scope.split(' ') : [];
    if (!scopes.includes(scope)) {
      return {
        ok: false,
        message: `This action requires the "${scope}" scope, which wasn't granted to this connection.`,
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: `Invalid access token`,
    };
  }
}
