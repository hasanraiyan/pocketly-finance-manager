import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { paginationQuerySchema } from '../../common/pagination/pagination-query.dto';
import { McpToolContext, requireScope } from '../mcp-context';
import { errorResult, textResult } from '../mcp-result';

export function registerCategoriesTools(
  server: McpServer,
  ctx: McpToolContext,
): void {
  server.registerTool(
    'get_categories',
    {
      title: 'Get categories',
      description: "List the user's income and expense categories.",
      inputSchema: paginationQuerySchema.shape,
    },
    async (rawArgs) => {
      const scope = await requireScope(ctx.token, 'pocketly:read');
      if (!scope.ok) return errorResult(scope.message);

      const query = paginationQuerySchema.parse(rawArgs);
      const page = await ctx.services.categories.findAll(ctx.user._id, query);
      return textResult(page);
    },
  );
}
