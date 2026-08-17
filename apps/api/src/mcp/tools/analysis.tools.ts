import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { analysisQuerySchema } from '../../analysis/dto/analysis-query.dto';
import { paginationQuerySchema } from '../../common/pagination/pagination-query.dto';
import { McpToolContext, requireScope } from '../mcp-context';
import { errorResult, textResult } from '../mcp-result';

const metricSchema = z
  .enum(['overview', 'cash_flow', 'category_breakdown', 'account_breakdown'])
  .default('overview')
  .describe('Which analysis metric to return');

export function registerAnalysisTools(
  server: McpServer,
  ctx: McpToolContext,
): void {
  server.registerTool(
    'get_analysis',
    {
      title: 'Get analysis',
      description:
        'Cash flow and spending analysis for a period: overall totals, day-by-day cash flow, spend by category, or income/expense by account.',
      inputSchema: {
        ...analysisQuerySchema.shape,
        metric: metricSchema,
        // The MCP SDK validates/transforms tool-call args against this
        // schema before the handler runs; analysisQuerySchema's from/to use
        // a transform (string -> Date), which would hand the handler an
        // already-transformed value that analysisQuerySchema.parse() below
        // can't re-parse. Kept as plain strings here for that reason.
        from: z
          .string()
          .optional()
          .describe('ISO 8601 date-time -- inclusive lower bound'),
        to: z
          .string()
          .optional()
          .describe('ISO 8601 date-time -- inclusive upper bound'),
      },
    },
    async (rawArgs) => {
      const scope = requireScope(ctx.scopes, 'pocketly:read');
      if (!scope.ok) return errorResult(scope.message);

      const { metric, ...rest } = rawArgs as { metric?: string } & Record<
        string,
        unknown
      >;
      const query = analysisQuerySchema.parse(rest);
      const { analysis } = ctx.services;

      switch (metric) {
        case 'cash_flow':
          return textResult(await analysis.getCashFlow(ctx.user, query));
        case 'category_breakdown':
          return textResult(
            await analysis.getCategoryBreakdown(ctx.user, query),
          );
        case 'account_breakdown':
          return textResult(
            await analysis.getAccountBreakdown(ctx.user, query),
          );
        case 'overview':
        default:
          return textResult(await analysis.getOverview(ctx.user, query));
      }
    },
  );

  server.registerTool(
    'get_financial_overview',
    {
      title: 'Get financial overview',
      description:
        "A snapshot of the user's current standing: total balance across accounts, and this month's income, expense, and net.",
      inputSchema: {},
    },
    async () => {
      const scope = requireScope(ctx.scopes, 'pocketly:read');
      if (!scope.ok) return errorResult(scope.message);

      const { analysis, accounts } = ctx.services;
      const query = analysisQuerySchema.parse({});
      const [overview, accountsPage] = await Promise.all([
        analysis.getOverview(ctx.user, query),
        // Personal accounts realistically number in the single/low double
        // digits; the schema's max (100) comfortably covers real usage
        // without needing to paginate for a one-shot overview.
        accounts.findAll(
          ctx.user._id,
          paginationQuerySchema.parse({ limit: 100 }),
        ),
      ]);
      const totalBalance = accountsPage.items.reduce(
        (sum, account) => sum + account.balance,
        0,
      );

      return textResult({
        currency: ctx.user.currency,
        totalBalance,
        accountCount: accountsPage.items.length,
        period: overview.period,
        income: overview.income,
        expense: overview.expense,
        net: overview.net,
      });
    },
  );
}
