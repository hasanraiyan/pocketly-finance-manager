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
    'get_transactions',
    {
      title: 'Get transactions',
      description:
        'List income, expense, and transfer records, with optional filters (type, account, category, date range, search text).',
      inputSchema: transactionQuerySchema.shape,
    },
    async (rawArgs) => {
      const scope = await requireScope(ctx.token, 'pocketly:read');
      if (!scope.ok) return errorResult(scope.message);

      const query = transactionQuerySchema.parse(rawArgs);
      const page = await ctx.services.transactions.findAll(ctx.user._id, query);
      return textResult(page);
    },
  );

  server.registerTool(
    'create_transaction',
    {
      title: 'Create transaction',
      description:
        'Record a new income, expense, or transfer. Amounts are integers in the smallest currency unit (e.g. cents/paise).',
      inputSchema: baseTransactionSchema.shape,
    },
    async (rawArgs) => {
      const scope = await requireScope(ctx.token, 'pocketly:write');
      if (!scope.ok) return errorResult(scope.message);

      const parsed = createTransactionSchema.safeParse(rawArgs);
      if (!parsed.success) return errorResult(parsed.error.message);

      const created = await ctx.services.transactions.create(
        ctx.user._id,
        parsed.data,
      );
      return textResult(created);
    },
  );

  server.registerTool(
    'update_transaction',
    {
      title: 'Update transaction',
      description: 'Edit an existing transaction by id.',
      inputSchema: {
        id: objectIdSchema.describe('The transaction id to update'),
        ...baseTransactionSchema.partial().shape,
      },
    },
    async (rawArgs) => {
      const scope = await requireScope(ctx.token, 'pocketly:write');
      if (!scope.ok) return errorResult(scope.message);

      const { id, ...rest } = rawArgs as { id: string } & Record<
        string,
        unknown
      >;
      const parsed = updateTransactionSchema.safeParse(rest);
      if (!parsed.success) return errorResult(parsed.error.message);

      const updated = await ctx.services.transactions.update(
        ctx.user._id,
        id,
        parsed.data,
      );
      return textResult(updated);
    },
  );

  server.registerTool(
    'delete_transaction',
    {
      title: 'Delete transaction',
      description:
        'Soft-delete a transaction by id. It stops counting toward balances/analysis but stays in history.',
      inputSchema: {
        id: objectIdSchema.describe('The transaction id to delete'),
      },
    },
    async ({ id }: { id: string }) => {
      const scope = await requireScope(ctx.token, 'pocketly:write');
      if (!scope.ok) return errorResult(scope.message);

      const removed = await ctx.services.transactions.remove(ctx.user._id, id);
      return textResult(removed);
    },
  );
}
