import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  createAccountSchema,
  updateAccountSchema,
} from '../../accounts/dto/account.dto';
import { paginationQuerySchema } from '../../common/pagination/pagination-query.dto';
import { objectIdSchema } from '../../common/validation/object-id.schema';
import { McpToolContext, requireScope } from '../mcp-context';
import { errorResult, textResult } from '../mcp-result';

export function registerAccountsTools(
  server: McpServer,
  ctx: McpToolContext,
): void {
  server.registerTool(
    'manage_account',
    {
      title: 'Manage accounts',
      description:
        'List, get, create, update, or delete bank accounts, wallets, and cards. "list"/"get" need only their own fields; "create" needs the full record; "update"/"delete" need "id".',
      inputSchema: {
        action: z.enum(['list', 'get', 'create', 'update', 'delete']),
        id: objectIdSchema
          .optional()
          .describe('Account id -- required for get/update/delete'),
        ...paginationQuerySchema.shape,
        ...createAccountSchema.partial().shape,
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
          if (!parsed.success) return errorResult(parsed.error.message);
          return textResult(await accounts.create(ctx.user._id, parsed.data));
        }
        case 'update': {
          const scope = await requireScope(ctx.token, 'pocketly:write');
          if (!scope.ok) return errorResult(scope.message);
          if (!rawArgs.id)
            return errorResult('"id" is required for action "update"');
          const { id, ...rest } = rawArgs;
          const parsed = updateAccountSchema.safeParse(rest);
          if (!parsed.success) return errorResult(parsed.error.message);
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
