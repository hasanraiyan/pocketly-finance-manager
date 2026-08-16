import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { paginationQuerySchema } from '../../common/pagination/pagination-query.dto';
import { McpToolContext, requireScope } from '../mcp-context';
import { errorResult, textResult } from '../mcp-result';

export function registerBudgetsTools(
  server: McpServer,
  ctx: McpToolContext,
): void {
  server.registerTool(
    'get_budgets',
    {
      title: 'Get budgets',
      description:
        'List budgets per category for the current period, including amount spent and percentage used.',
      inputSchema: paginationQuerySchema.shape,
    },
    async (rawArgs) => {
      const scope = await requireScope(ctx.token, 'pocketly:read');
      if (!scope.ok) return errorResult(scope.message);

      const query = paginationQuerySchema.parse(rawArgs);
      const page = await ctx.services.budgets.findAll(ctx.user, query);
      return textResult(page);
    },
  );
}
