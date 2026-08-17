import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { paginationQuerySchema } from '../../common/pagination/pagination-query.dto';
import { objectIdSchema } from '../../common/validation/object-id.schema';
import {
  createRecurrenceSchema,
  recurrenceFields,
  updateRecurrenceSchema,
} from '../../recurrences/dto/recurrence.dto';
import { McpToolContext, requireScope } from '../mcp-context';
import { errorResult, textResult, zodErrorResult } from '../mcp-result';

const DESCRIPTION = `Manage repeating records -- rent, salary, subscriptions, EMIs. A rule creates a real record on its own schedule; it is not itself a record. One tool, seven actions via the "action" field:

- list: optional cursor, limit (default 20, max 100). Returns rules with nextRunAt (when each fires next) and paused.
- get: requires id.
- create: requires type (income, expense, or transfer), amount (integer, smallest currency unit), accountId, frequency (daily, weekly, monthly, or yearly), startDate (ISO 8601). Optional: description, note, categoryId (not for transfers), toAccountId (transfers only), interval (default 1 -- "every N periods", so interval 2 + weekly is fortnightly), endDate (omit to repeat indefinitely).
- update: requires id, plus only the fields you want to change. Changing the schedule recomputes when it next fires.
- pause: requires id. Stops it firing without deleting it.
- resume: requires id. Restarts from now -- it does not backfill the time it was paused.
- delete: requires id. Records the rule already created stay in history.

The first record lands on startDate, then every interval periods after it. A rule starting on the 31st fires on the 30th or 28th in shorter months and returns to the 31st afterwards -- it does not drift earlier.`;

export function registerRecurrencesTools(
  server: McpServer,
  ctx: McpToolContext,
): void {
  server.registerTool(
    'manage_recurrence',
    {
      title: 'Manage repeating records',
      description: DESCRIPTION,
      inputSchema: {
        action: z.enum([
          'list',
          'get',
          'create',
          'update',
          'pause',
          'resume',
          'delete',
        ]),
        id: objectIdSchema
          .optional()
          .describe(
            'Recurrence id -- required for get/update/pause/resume/delete',
          ),
        ...paginationQuerySchema.shape,
        // Spread the raw field map rather than createRecurrenceSchema.partial():
        // the create schema carries a cross-field refinement, and .partial()
        // on a refined schema would still demand both dates together.
        ...z.object(recurrenceFields).partial().shape,
      },
    },
    async (rawArgs) => {
      const { recurrences } = ctx.services;

      switch (rawArgs.action) {
        case 'list': {
          const scope = requireScope(ctx.scopes, 'pocketly:read');
          if (!scope.ok) return errorResult(scope.message);
          const query = paginationQuerySchema.parse(rawArgs);
          return textResult(await recurrences.findAll(ctx.user, query));
        }
        case 'get': {
          const scope = requireScope(ctx.scopes, 'pocketly:read');
          if (!scope.ok) return errorResult(scope.message);
          if (!rawArgs.id)
            return errorResult('"id" is required for action "get"');
          return textResult(await recurrences.findOne(ctx.user, rawArgs.id));
        }
        case 'create': {
          const scope = requireScope(ctx.scopes, 'pocketly:write');
          if (!scope.ok) return errorResult(scope.message);
          const parsed = createRecurrenceSchema.safeParse(rawArgs);
          if (!parsed.success) return zodErrorResult(parsed.error);
          return textResult(await recurrences.create(ctx.user, parsed.data));
        }
        case 'update': {
          const scope = requireScope(ctx.scopes, 'pocketly:write');
          if (!scope.ok) return errorResult(scope.message);
          if (!rawArgs.id)
            return errorResult('"id" is required for action "update"');
          const { id, ...rest } = rawArgs;
          const parsed = updateRecurrenceSchema.safeParse(rest);
          if (!parsed.success) return zodErrorResult(parsed.error);
          return textResult(
            await recurrences.update(ctx.user, id, parsed.data),
          );
        }
        case 'pause':
        case 'resume': {
          const scope = requireScope(ctx.scopes, 'pocketly:write');
          if (!scope.ok) return errorResult(scope.message);
          if (!rawArgs.id)
            return errorResult(
              `"id" is required for action "${rawArgs.action}"`,
            );
          return textResult(
            await recurrences.setPaused(
              ctx.user,
              rawArgs.id,
              rawArgs.action === 'pause',
            ),
          );
        }
        case 'delete': {
          const scope = requireScope(ctx.scopes, 'pocketly:write');
          if (!scope.ok) return errorResult(scope.message);
          if (!rawArgs.id)
            return errorResult('"id" is required for action "delete"');
          return textResult(await recurrences.remove(ctx.user, rawArgs.id));
        }
      }
    },
  );
}
