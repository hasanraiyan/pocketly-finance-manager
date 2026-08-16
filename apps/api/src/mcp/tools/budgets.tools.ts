import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  createBudgetSchema,
  updateBudgetSchema,
} from '../../budgets/dto/budget.dto';
import { paginationQuerySchema } from '../../common/pagination/pagination-query.dto';
import { objectIdSchema } from '../../common/validation/object-id.schema';
import { McpToolContext, requireScope } from '../mcp-context';
import { errorResult, textResult } from '../mcp-result';

export function registerBudgetsTools(
  server: McpServer,
  ctx: McpToolContext,
): void {
  server.registerTool(
    'manage_budget',
    {
      title: 'Manage budgets',
      description:
        'List, get, create, update, or delete budgets (one per category/period). "list"/"get" need only their own fields; "create" needs the full record; "update"/"delete" need "id". Budgets can only be set on expense categories.',
      inputSchema: {
        action: z.enum(['list', 'get', 'create', 'update', 'delete']),
        id: objectIdSchema
          .optional()
          .describe('Budget id -- required for get/update/delete'),
        ...paginationQuerySchema.shape,
        ...createBudgetSchema.partial().shape,
      },
    },
    async (rawArgs) => {
      const { budgets } = ctx.services;

      switch (rawArgs.action) {
        case 'list': {
          const scope = await requireScope(ctx.token, 'pocketly:read');
          if (!scope.ok) return errorResult(scope.message);
          const query = paginationQuerySchema.parse(rawArgs);
          return textResult(await budgets.findAll(ctx.user, query));
        }
        case 'get': {
          const scope = await requireScope(ctx.token, 'pocketly:read');
          if (!scope.ok) return errorResult(scope.message);
          if (!rawArgs.id)
            return errorResult('"id" is required for action "get"');
          return textResult(await budgets.findOne(ctx.user, rawArgs.id));
        }
        case 'create': {
          const scope = await requireScope(ctx.token, 'pocketly:write');
          if (!scope.ok) return errorResult(scope.message);
          const parsed = createBudgetSchema.safeParse(rawArgs);
          if (!parsed.success) return errorResult(parsed.error.message);
          return textResult(await budgets.create(ctx.user, parsed.data));
        }
        case 'update': {
          const scope = await requireScope(ctx.token, 'pocketly:write');
          if (!scope.ok) return errorResult(scope.message);
          if (!rawArgs.id)
            return errorResult('"id" is required for action "update"');
          const { id, ...rest } = rawArgs;
          const parsed = updateBudgetSchema.safeParse(rest);
          if (!parsed.success) return errorResult(parsed.error.message);
          return textResult(await budgets.update(ctx.user, id, parsed.data));
        }
        case 'delete': {
          const scope = await requireScope(ctx.token, 'pocketly:write');
          if (!scope.ok) return errorResult(scope.message);
          if (!rawArgs.id)
            return errorResult('"id" is required for action "delete"');
          return textResult(await budgets.remove(ctx.user, rawArgs.id));
        }
      }
    },
  );
}
