import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { analysisQuerySchema } from '../../analysis/dto/analysis-query.dto';
import { McpToolContext, requireScope } from '../mcp-context';
import { errorResult, textResult } from '../mcp-result';

const metricSchema = z
  .enum([
    'overview',
    'cash_flow',
    'category_breakdown',
    'account_breakdown',
    'insights',
  ])
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
        'Cash flow and spending analysis for a period: overall totals, day-by-day cash flow, spend by category, income/expense by account, or "insights" -- notable facts Pocketly derived from the numbers (a category well above its own average, a budget on pace to be exceeded, a negative period). Insights are computed arithmetic, not opinions, and the list is empty when nothing is notable.',
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
        case 'insights':
          return textResult(
            await ctx.services.insights.getInsights(ctx.user, query),
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
        'A snapshot of where the user stands right now: total balance across accounts, this month\'s income, expense and net, how much is safe to spend today, and the projected balance at the end of the month. Use this as the one-shot answer to "how am I doing"; use get_outlook for the detail behind the forward-looking figures.',
      inputSchema: {},
    },
    async () => {
      const scope = requireScope(ctx.scopes, 'pocketly:read');
      if (!scope.ok) return errorResult(scope.message);

      const { analysis, accounts, safeToSpend, forecast } = ctx.services;
      const query = analysisQuerySchema.parse({});
      const [overview, allAccounts, spendable, projection] = await Promise.all([
        analysis.getOverview(ctx.user, query),
        // findAllForContext, not findAll: the latter is the paginated REST
        // list (capped at 100), which would under-report the total for
        // anyone with more accounts than that.
        accounts.findAllForContext(ctx.user._id),
        safeToSpend.safeToSpend(ctx.user),
        forecast.forecast(ctx.user, 'month'),
      ]);
      const totalBalance = allAccounts.reduce(
        (sum, account) => sum + account.balance,
        0,
      );

      return textResult({
        currency: ctx.user.currency,
        totalBalance,
        accountCount: allAccounts.length,
        period: overview.period,
        income: overview.income,
        expense: overview.expense,
        net: overview.net,
        safeToSpend: spendable.amount,
        safeToSpendShortfall: spendable.shortfall,
        projectedMonthEndBalance: projection.projectedBalance,
        // Null unless the balance is projected to go negative first.
        projectedShortfallDate: projection.shortfallDate,
      });
    },
  );
}
