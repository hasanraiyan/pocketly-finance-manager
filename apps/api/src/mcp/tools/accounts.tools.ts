import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { paginationQuerySchema } from '../../common/pagination/pagination-query.dto';
import { McpToolContext, requireScope } from '../mcp-context';
import { errorResult, textResult } from '../mcp-result';

export function registerAccountsTools(
  server: McpServer,
  ctx: McpToolContext,
): void {
  server.registerTool(
    'get_accounts',
    {
      title: 'Get accounts',
      description:
        "List the user's bank accounts, wallets, and cards, with current balances.",
      inputSchema: paginationQuerySchema.shape,
    },
    async (rawArgs) => {
      const scope = await requireScope(ctx.token, 'pocketly:read');
      if (!scope.ok) return errorResult(scope.message);

      const query = paginationQuerySchema.parse(rawArgs);
      const page = await ctx.services.accounts.findAll(ctx.user._id, query);
      return textResult(page);
    },
  );
}
