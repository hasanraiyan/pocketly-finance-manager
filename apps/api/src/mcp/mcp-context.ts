import { AccountsService } from '../accounts/accounts.service';
import { AnalysisService } from '../analysis/analysis.service';
import { InsightsService } from '../analysis/insights.service';
import { BudgetsService } from '../budgets/budgets.service';
import { CategoriesService } from '../categories/categories.service';
import { RecurrencesService } from '../recurrences/recurrences.service';
import { TransactionsService } from '../transactions/transactions.service';
import { UserDocument } from '../users/schemas/user.schema';

export type McpScope = 'pocketly:read' | 'pocketly:write';

export interface McpToolServices {
  accounts: AccountsService;
  transactions: TransactionsService;
  budgets: BudgetsService;
  categories: CategoriesService;
  analysis: AnalysisService;
  insights: InsightsService;
  recurrences: RecurrencesService;
}

export interface McpToolContext {
  user: UserDocument;
  token: string;
  /**
   * Pocketly scopes this connection holds, decided in McpAuthGuard from
   * Clerk's verification of the access token. See GRANTED_SCOPES there for
   * why this is currently all-or-nothing.
   */
  scopes: McpScope[];
  services: McpToolServices;
}

/**
 * Checks a specific scope right before a tool acts on it. The scopes come
 * from Clerk's verification of the access token (McpAuthGuard) -- never from
 * an unverified client-side decode of the token itself.
 */
export function requireScope(
  scopes: McpScope[],
  scope: McpScope,
): { ok: true } | { ok: false; message: string } {
  if (!scopes.includes(scope)) {
    return {
      ok: false,
      message: `This action requires the "${scope}" scope, which wasn't granted to this connection.`,
    };
  }
  return { ok: true };
}
