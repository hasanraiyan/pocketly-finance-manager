import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { paginationQuerySchema } from '../../common/pagination/pagination-query.dto';
import { objectIdSchema } from '../../common/validation/object-id.schema';
import {
  createMoneyRuleSchema,
  updateMoneyRuleSchema,
} from '../../money-rules/dto/money-rule.dto';
import { McpToolContext, requireScope } from '../mcp-context';
import { errorResult, textResult, zodErrorResult } from '../mcp-result';

const DESCRIPTION = `Manage money rules -- standing alerts Pocketly evaluates every six hours and sends as notifications. One tool, five actions via the "action" field:

- list: optional cursor, limit (default 20, max 100).
- get: requires id.
- create: requires kind. Threshold kinds also require threshold (minor units):
    - category_over: alerts when spending in one category passes the threshold this month. Also requires categoryId.
    - balance_under: alerts when total balance across accounts falls below the threshold.
    - large_transaction: alerts on any single expense above the threshold.
  Digest kinds use cadenceDays (default 7) instead of a threshold:
    - weekly_summary: a periodic in/out summary.
    - goal_progress: a periodic note on which goals are behind.
- update: requires id, plus only the fields you want to change.
- delete: requires id.

A threshold rule fires once per crossing and re-arms only when the value returns to the other side, so a balance parked under its floor does not alert repeatedly.`;

export function registerMoneyRulesTools(
  server: McpServer,
  ctx: McpToolContext,
): void {
  server.registerTool(
    'manage_money_rule',
    {
      title: 'Manage money rules',
      description: DESCRIPTION,
      inputSchema: {
        action: z.enum(['list', 'get', 'create', 'update', 'delete']),
        id: objectIdSchema
          .optional()
          .describe('Rule id -- required for get/update/delete'),
        ...paginationQuerySchema.shape,
        ...updateMoneyRuleSchema.shape,
      },
    },
    async (rawArgs) => {
      const { moneyRules } = ctx.services;

      switch (rawArgs.action) {
        case 'list': {
          const scope = requireScope(ctx.scopes, 'pocketly:read');
          if (!scope.ok) return errorResult(scope.message);
          const query = paginationQuerySchema.parse(rawArgs);
          return textResult(await moneyRules.findAll(ctx.user, query));
        }
        case 'get': {
          const scope = requireScope(ctx.scopes, 'pocketly:read');
          if (!scope.ok) return errorResult(scope.message);
          if (!rawArgs.id)
            return errorResult('"id" is required for action "get"');
          return textResult(await moneyRules.findOne(ctx.user, rawArgs.id));
        }
        case 'create': {
          const scope = requireScope(ctx.scopes, 'pocketly:write');
          if (!scope.ok) return errorResult(scope.message);
          const parsed = createMoneyRuleSchema.safeParse(rawArgs);
          if (!parsed.success) return zodErrorResult(parsed.error);
          return textResult(await moneyRules.create(ctx.user, parsed.data));
        }
        case 'update': {
          const scope = requireScope(ctx.scopes, 'pocketly:write');
          if (!scope.ok) return errorResult(scope.message);
          if (!rawArgs.id)
            return errorResult('"id" is required for action "update"');
          const { id, ...rest } = rawArgs;
          const parsed = updateMoneyRuleSchema.safeParse(rest);
          if (!parsed.success) return zodErrorResult(parsed.error);
          return textResult(await moneyRules.update(ctx.user, id, parsed.data));
        }
        case 'delete': {
          const scope = requireScope(ctx.scopes, 'pocketly:write');
          if (!scope.ok) return errorResult(scope.message);
          if (!rawArgs.id)
            return errorResult('"id" is required for action "delete"');
          return textResult(await moneyRules.remove(ctx.user, rawArgs.id));
        }
      }
    },
  );
}
