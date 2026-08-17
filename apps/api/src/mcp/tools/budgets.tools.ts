import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  createBudgetSchema,
  updateBudgetSchema,
} from '../../budgets/dto/budget.dto';
import { paginationQuerySchema } from '../../common/pagination/pagination-query.dto';
import { objectIdSchema } from '../../common/validation/object-id.schema';
import { McpToolContext, requireScope } from '../mcp-context';
import { errorResult, textResult, zodErrorResult } from '../mcp-result';

const DESCRIPTION = `Manage budgets -- one spending limit per category and period. One tool, five actions via the "action" field:

- list: optional cursor, limit (default 20, max 100). Returns budgets with amount spent and percentage used for the current period.
- get: requires id.
- create: requires categoryId (must be an expense category), amount, period (weekly, monthly, or yearly). Only one active budget is allowed per category+period combination.
- update: requires id, plus only the fields you want to change.
- delete: requires id.`;

export function registerBudgetsTools(
  server: McpServer,
  ctx: McpToolContext,
): void {
  server.registerTool(
    'manage_budget',
    {
      title: 'Manage budgets',
      description: DESCRIPTION,
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
          const scope = requireScope(ctx.token, 'pocketly:read');
          if (!scope.ok) return errorResult(scope.message);
          const query = paginationQuerySchema.parse(rawArgs);
          return textResult(await budgets.findAll(ctx.user, query));
        }
        case 'get': {
          const scope = requireScope(ctx.token, 'pocketly:read');
          if (!scope.ok) return errorResult(scope.message);
          if (!rawArgs.id)
            return errorResult('"id" is required for action "get"');
          return textResult(await budgets.findOne(ctx.user, rawArgs.id));
        }
        case 'create': {
          const scope = requireScope(ctx.token, 'pocketly:write');
          if (!scope.ok) return errorResult(scope.message);
          const parsed = createBudgetSchema.safeParse(rawArgs);
          if (!parsed.success) return zodErrorResult(parsed.error);
          return textResult(await budgets.create(ctx.user, parsed.data));
        }
        case 'update': {
          const scope = requireScope(ctx.token, 'pocketly:write');
          if (!scope.ok) return errorResult(scope.message);
          if (!rawArgs.id)
            return errorResult('"id" is required for action "update"');
          const { id, ...rest } = rawArgs;
          const parsed = updateBudgetSchema.safeParse(rest);
          if (!parsed.success) return zodErrorResult(parsed.error);
          return textResult(await budgets.update(ctx.user, id, parsed.data));
        }
        case 'delete': {
          const scope = requireScope(ctx.token, 'pocketly:write');
          if (!scope.ok) return errorResult(scope.message);
          if (!rawArgs.id)
            return errorResult('"id" is required for action "delete"');
          return textResult(await budgets.remove(ctx.user, rawArgs.id));
        }
      }
    },
  );
}
