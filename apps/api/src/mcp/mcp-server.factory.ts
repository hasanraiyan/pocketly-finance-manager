import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AccountsService } from '../accounts/accounts.service';
import { AnalysisService } from '../analysis/analysis.service';
import { BudgetsService } from '../budgets/budgets.service';
import { CategoriesService } from '../categories/categories.service';
import { RecurrencesService } from '../recurrences/recurrences.service';
import { TransactionsService } from '../transactions/transactions.service';
import { UserDocument } from '../users/schemas/user.schema';
import { McpScope, McpToolContext } from './mcp-context';
import { registerAccountsTools } from './tools/accounts.tools';
import { registerAnalysisTools } from './tools/analysis.tools';
import { registerBudgetsTools } from './tools/budgets.tools';
import { registerCategoriesTools } from './tools/categories.tools';
import { registerRecurrencesTools } from './tools/recurrences.tools';
import { registerTransactionsTools } from './tools/transactions.tools';

/**
 * Builds a fresh McpServer per request (stateless Streamable HTTP -- see
 * mcp.controller.ts). Each server's tools close over this request's
 * resolved user/token, so tool handlers don't need any SDK-level mechanism
 * for threading auth context through -- reusing the exact same domain
 * services the REST API uses is what makes "same authorization rules, no
 * bypass" true by construction.
 */
@Injectable()
export class McpServerFactory {
  constructor(
    private readonly accounts: AccountsService,
    private readonly transactions: TransactionsService,
    private readonly budgets: BudgetsService,
    private readonly categories: CategoriesService,
    private readonly analysis: AnalysisService,
    private readonly recurrences: RecurrencesService,
  ) {}

  build(user: UserDocument, token: string, scopes: McpScope[]): McpServer {
    const server = new McpServer({ name: 'pocketly', version: '1.0.0' });
    const ctx: McpToolContext = {
      user,
      token,
      scopes,
      services: {
        accounts: this.accounts,
        transactions: this.transactions,
        budgets: this.budgets,
        categories: this.categories,
        analysis: this.analysis,
        recurrences: this.recurrences,
      },
    };

    registerAccountsTools(server, ctx);
    registerTransactionsTools(server, ctx);
    registerBudgetsTools(server, ctx);
    registerCategoriesTools(server, ctx);
    registerAnalysisTools(server, ctx);
    registerRecurrencesTools(server, ctx);

    return server;
  }
}
