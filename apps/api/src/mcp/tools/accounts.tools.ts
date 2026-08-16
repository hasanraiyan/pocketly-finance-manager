import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  accountFields,
  createAccountSchema,
  updateAccountSchema,
} from '../../accounts/dto/account.dto';
import { paginationQuerySchema } from '../../common/pagination/pagination-query.dto';
import { objectIdSchema } from '../../common/validation/object-id.schema';
import { McpToolContext, requireScope } from '../mcp-context';
import { errorResult, textResult, zodErrorResult } from '../mcp-result';

const DESCRIPTION = `Manage bank accounts, wallets, and cards. One tool, five actions via the "action" field:

- list: optional cursor, limit (default 20, max 100). Returns accounts with their current balance.
- get: requires id.
- create: requires name, type (one of: bank, cash, savings, upi, credit_card, wallet). Optional: icon, initialBalance (integer, smallest currency unit, default 0), currency (3-letter code, default INR).
- update: requires id, plus only the fields you want to change (also accepts ignored: true/false to hide/show it without deleting).
- delete: requires id. Archives the account -- its past records stay in history, but it stops appearing in totals.`;

export function registerAccountsTools(
  server: McpServer,
  ctx: McpToolContext,
): void {
  server.registerTool(
    'manage_account',
    {
      title: 'Manage accounts',
      description: DESCRIPTION,
      inputSchema: {
        action: z.enum(['list', 'get', 'create', 'update', 'delete']),
        id: objectIdSchema
          .optional()
          .describe('Account id -- required for get/update/delete'),
        ...paginationQuerySchema.shape,
        // Optional, no defaults -- accountFields itself has none (see
        // account.dto.ts), so unlike createAccountSchema.partial() this
        // won't have the SDK's own inputSchema validation silently fill in
        // initialBalance/currency before the handler (and its own
        // create/update-specific parsing) ever sees the raw arguments.
        ...z.object(accountFields).partial().shape,
        ignored: z
          .boolean()
          .optional()
          .describe('update only: hide (true) or show (false) this account'),
      },
    },
    async (rawArgs) => {
      const { accounts } = ctx.services;

      switch (rawArgs.action) {
        case 'list': {
          const scope = await requireScope(ctx.token, 'pocketly:read');
          if (!scope.ok) return errorResult(scope.message);
          const query = paginationQuerySchema.parse(rawArgs);
          return textResult(await accounts.findAll(ctx.user._id, query));
        }
        case 'get': {
          const scope = await requireScope(ctx.token, 'pocketly:read');
          if (!scope.ok) return errorResult(scope.message);
          if (!rawArgs.id)
            return errorResult('"id" is required for action "get"');
          return textResult(await accounts.findOne(ctx.user._id, rawArgs.id));
        }
        case 'create': {
          const scope = await requireScope(ctx.token, 'pocketly:write');
          if (!scope.ok) return errorResult(scope.message);
          const parsed = createAccountSchema.safeParse(rawArgs);
          if (!parsed.success) return zodErrorResult(parsed.error);
          return textResult(await accounts.create(ctx.user._id, parsed.data));
        }
        case 'update': {
          const scope = await requireScope(ctx.token, 'pocketly:write');
          if (!scope.ok) return errorResult(scope.message);
          if (!rawArgs.id)
            return errorResult('"id" is required for action "update"');
          const { id, ...rest } = rawArgs;
          const parsed = updateAccountSchema.safeParse(rest);
          if (!parsed.success) return zodErrorResult(parsed.error);
          return textResult(
            await accounts.update(ctx.user._id, id, parsed.data),
          );
        }
        case 'delete': {
          const scope = await requireScope(ctx.token, 'pocketly:write');
          if (!scope.ok) return errorResult(scope.message);
          if (!rawArgs.id)
            return errorResult('"id" is required for action "delete"');
          return textResult(await accounts.remove(ctx.user._id, rawArgs.id));
        }
      }
    },
  );
}
