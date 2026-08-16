import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  baseTransactionSchema,
  createTransactionSchema,
  transactionQuerySchema,
  updateTransactionSchema,
} from '../../transactions/dto/transaction.dto';
import { objectIdSchema } from '../../common/validation/object-id.schema';
import { McpToolContext, requireScope } from '../mcp-context';
import { errorResult, textResult } from '../mcp-result';

export function registerTransactionsTools(
  server: McpServer,
  ctx: McpToolContext,
): void {
  server.registerTool(
    'manage_transaction',
    {
      title: 'Manage transactions',
      description:
        'List, get, create, update, or delete income/expense/transfer records. Amounts are integers in the smallest currency unit (e.g. cents/paise). "list"/"get" need only their own fields; "create" needs the full record; "update"/"delete" need "id".',
      inputSchema: {
        action: z.enum(['list', 'get', 'create', 'update', 'delete']),
        id: objectIdSchema
          .optional()
          .describe('Transaction id -- required for get/update/delete'),
        ...transactionQuerySchema.shape,
        ...baseTransactionSchema.partial().shape,
      },
    },
    async (rawArgs) => {
      const { transactions } = ctx.services;

      switch (rawArgs.action) {
        case 'list': {
          const scope = await requireScope(ctx.token, 'pocketly:read');
          if (!scope.ok) return errorResult(scope.message);
          const query = transactionQuerySchema.parse(rawArgs);
          return textResult(await transactions.findAll(ctx.user._id, query));
        }
        case 'get': {
          const scope = await requireScope(ctx.token, 'pocketly:read');
          if (!scope.ok) return errorResult(scope.message);
          if (!rawArgs.id)
            return errorResult('"id" is required for action "get"');
          return textResult(
            await transactions.findOne(ctx.user._id, rawArgs.id),
          );
        }
        case 'create': {
          const scope = await requireScope(ctx.token, 'pocketly:write');
          if (!scope.ok) return errorResult(scope.message);
          const parsed = createTransactionSchema.safeParse(rawArgs);
          if (!parsed.success) return errorResult(parsed.error.message);
          return textResult(
            await transactions.create(ctx.user._id, parsed.data),
          );
        }
        case 'update': {
          const scope = await requireScope(ctx.token, 'pocketly:write');
          if (!scope.ok) return errorResult(scope.message);
          if (!rawArgs.id)
            return errorResult('"id" is required for action "update"');
          const { id, ...rest } = rawArgs;
          const parsed = updateTransactionSchema.safeParse(rest);
          if (!parsed.success) return errorResult(parsed.error.message);
          return textResult(
            await transactions.update(ctx.user._id, id, parsed.data),
          );
        }
        case 'delete': {
          const scope = await requireScope(ctx.token, 'pocketly:write');
          if (!scope.ok) return errorResult(scope.message);
          if (!rawArgs.id)
            return errorResult('"id" is required for action "delete"');
          return textResult(
            await transactions.remove(ctx.user._id, rawArgs.id),
          );
        }
      }
    },
  );
}
