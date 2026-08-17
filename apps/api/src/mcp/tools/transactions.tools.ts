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
import { errorResult, textResult, zodErrorResult } from '../mcp-result';

const DESCRIPTION = `Manage income, expense, and transfer records. One tool, five actions via the "action" field:

- list: optional filters -- type, accountId, categoryId, from, to (ISO date), q (search description/note), cursor, limit (default 20, max 100).
- get: requires id.
- create: requires type, amount, accountId, date (ISO 8601). For type="income" or "expense", categoryId is also required. For type="transfer", toAccountId is required instead (must differ from accountId) and categoryId must be omitted. description and note are optional.
- update: requires id, plus only the fields you want to change (same rules as create for whichever fields you include).
- delete: requires id. Soft-deletes -- stays in history but stops counting toward balances/analysis.

Amounts are integers in the smallest currency unit (e.g. cents/paise) -- ₹500.00 is 50000.`;

export function registerTransactionsTools(
  server: McpServer,
  ctx: McpToolContext,
): void {
  server.registerTool(
    'manage_transaction',
    {
      title: 'Manage transactions',
      description: DESCRIPTION,
      inputSchema: {
        action: z.enum(['list', 'get', 'create', 'update', 'delete']),
        id: objectIdSchema
          .optional()
          .describe('Transaction id -- required for get/update/delete'),
        ...transactionQuerySchema.shape,
        ...baseTransactionSchema.partial().shape,
        // The MCP SDK validates/transforms tool-call args against this
        // schema before the handler runs, so a transform-based Zod schema
        // here (isoDateSchema turns a string into a real Date) hands the
        // handler an already-transformed value. The internal *Schema.parse
        // calls below expect the raw string and do that transform
        // themselves, so these three must stay plain strings.
        date: z
          .string()
          .optional()
          .describe('ISO 8601 date-time, e.g. 2026-08-16T10:00:00Z'),
        from: z
          .string()
          .optional()
          .describe('ISO 8601 date-time -- inclusive lower bound for "list"'),
        to: z
          .string()
          .optional()
          .describe('ISO 8601 date-time -- inclusive upper bound for "list"'),
      },
    },
    async (rawArgs) => {
      const { transactions } = ctx.services;

      switch (rawArgs.action) {
        case 'list': {
          const scope = requireScope(ctx.token, 'pocketly:read');
          if (!scope.ok) return errorResult(scope.message);
          const query = transactionQuerySchema.parse(rawArgs);
          return textResult(await transactions.findAll(ctx.user._id, query));
        }
        case 'get': {
          const scope = requireScope(ctx.token, 'pocketly:read');
          if (!scope.ok) return errorResult(scope.message);
          if (!rawArgs.id)
            return errorResult('"id" is required for action "get"');
          return textResult(
            await transactions.findOne(ctx.user._id, rawArgs.id),
          );
        }
        case 'create': {
          const scope = requireScope(ctx.token, 'pocketly:write');
          if (!scope.ok) return errorResult(scope.message);
          const parsed = createTransactionSchema.safeParse(rawArgs);
          if (!parsed.success) return zodErrorResult(parsed.error);
          return textResult(
            await transactions.create(ctx.user._id, parsed.data),
          );
        }
        case 'update': {
          const scope = requireScope(ctx.token, 'pocketly:write');
          if (!scope.ok) return errorResult(scope.message);
          if (!rawArgs.id)
            return errorResult('"id" is required for action "update"');
          const { id, ...rest } = rawArgs;
          const parsed = updateTransactionSchema.safeParse(rest);
          if (!parsed.success) return zodErrorResult(parsed.error);
          return textResult(
            await transactions.update(ctx.user._id, id, parsed.data),
          );
        }
        case 'delete': {
          const scope = requireScope(ctx.token, 'pocketly:write');
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
