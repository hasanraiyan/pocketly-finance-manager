import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { paginationQuerySchema } from '../../common/pagination/pagination-query.dto';
import { objectIdSchema } from '../../common/validation/object-id.schema';
import {
  contributeSchema,
  createGoalSchema,
  updateGoalSchema,
} from '../../goals/dto/goal.dto';
import { McpToolContext, requireScope } from '../mcp-context';
import { errorResult, textResult, zodErrorResult } from '../mcp-result';

const DESCRIPTION = `Manage financial goals -- what the user is saving towards, with progress and a projected completion date. One tool, six actions via the "action" field:

- list: optional cursor, limit (default 20, max 100). Each goal comes back with progress, percent complete, projected completion date, the monthly amount its deadline requires, and a status of complete, on_track, at_risk or stalled.
- get: requires id.
- create: requires name and targetAmount (minor units). Optional: kind (emergency_fund, purchase, travel, education, debt_payoff, savings, other), monthlyContribution, targetDate (ISO 8601), accountId, savedAmount.
- update: requires id, plus only the fields you want to change.
- contribute: requires id and amount (minor units; negative withdraws). Only valid for goals not linked to an account -- a linked goal's progress is the account balance, so money has to move in the account instead.
- delete: requires id.

Amounts are integer minor units (100 = 1.00). A goal linked to an accountId reports that account's balance as its progress.`;

export function registerGoalsTools(
  server: McpServer,
  ctx: McpToolContext,
): void {
  server.registerTool(
    'manage_goal',
    {
      title: 'Manage goals',
      description: DESCRIPTION,
      inputSchema: {
        action: z.enum([
          'list',
          'get',
          'create',
          'update',
          'contribute',
          'delete',
        ]),
        id: objectIdSchema
          .optional()
          .describe('Goal id -- required for get/update/contribute/delete'),
        ...paginationQuerySchema.shape,
        ...createGoalSchema.partial().shape,
        // Same reasoning as analysis.tools.ts: the SDK validates args against
        // this schema before the handler runs, so a transforming date schema
        // would hand the handler an already-transformed value the DTO can't
        // re-parse.
        targetDate: z
          .string()
          .optional()
          .describe('ISO 8601 date -- the deadline, if there is one'),
        amount: z
          .number()
          .int()
          .optional()
          .describe(
            'Minor units to add to progress -- required for action "contribute", negative to withdraw',
          ),
      },
    },
    async (rawArgs) => {
      const { goals } = ctx.services;

      switch (rawArgs.action) {
        case 'list': {
          const scope = requireScope(ctx.scopes, 'pocketly:read');
          if (!scope.ok) return errorResult(scope.message);
          const query = paginationQuerySchema.parse(rawArgs);
          return textResult(await goals.findAll(ctx.user, query));
        }
        case 'get': {
          const scope = requireScope(ctx.scopes, 'pocketly:read');
          if (!scope.ok) return errorResult(scope.message);
          if (!rawArgs.id)
            return errorResult('"id" is required for action "get"');
          return textResult(await goals.findOne(ctx.user, rawArgs.id));
        }
        case 'create': {
          const scope = requireScope(ctx.scopes, 'pocketly:write');
          if (!scope.ok) return errorResult(scope.message);
          const parsed = createGoalSchema.safeParse(rawArgs);
          if (!parsed.success) return zodErrorResult(parsed.error);
          return textResult(await goals.create(ctx.user, parsed.data));
        }
        case 'update': {
          const scope = requireScope(ctx.scopes, 'pocketly:write');
          if (!scope.ok) return errorResult(scope.message);
          if (!rawArgs.id)
            return errorResult('"id" is required for action "update"');
          const { id, ...rest } = rawArgs;
          const parsed = updateGoalSchema.safeParse(rest);
          if (!parsed.success) return zodErrorResult(parsed.error);
          return textResult(await goals.update(ctx.user, id, parsed.data));
        }
        case 'contribute': {
          const scope = requireScope(ctx.scopes, 'pocketly:write');
          if (!scope.ok) return errorResult(scope.message);
          if (!rawArgs.id)
            return errorResult('"id" is required for action "contribute"');
          const parsed = contributeSchema.safeParse(rawArgs);
          if (!parsed.success) return zodErrorResult(parsed.error);
          return textResult(
            await goals.contribute(ctx.user, rawArgs.id, parsed.data),
          );
        }
        case 'delete': {
          const scope = requireScope(ctx.scopes, 'pocketly:write');
          if (!scope.ok) return errorResult(scope.message);
          if (!rawArgs.id)
            return errorResult('"id" is required for action "delete"');
          return textResult(await goals.remove(ctx.user, rawArgs.id));
        }
      }
    },
  );
}
