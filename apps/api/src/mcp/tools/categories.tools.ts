import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  createCategorySchema,
  updateCategorySchema,
} from '../../categories/dto/category.dto';
import { paginationQuerySchema } from '../../common/pagination/pagination-query.dto';
import { objectIdSchema } from '../../common/validation/object-id.schema';
import { McpToolContext, requireScope } from '../mcp-context';
import { errorResult, textResult } from '../mcp-result';

export function registerCategoriesTools(
  server: McpServer,
  ctx: McpToolContext,
): void {
  server.registerTool(
    'manage_category',
    {
      title: 'Manage categories',
      description:
        'List, get, create, update, or delete income/expense categories. "list"/"get" need only their own fields; "create" needs the full record; "update"/"delete" need "id". Categories in use by a transaction or budget can\'t be deleted.',
      inputSchema: {
        action: z.enum(['list', 'get', 'create', 'update', 'delete']),
        id: objectIdSchema
          .optional()
          .describe('Category id -- required for get/update/delete'),
        ...paginationQuerySchema.shape,
        ...createCategorySchema.partial().shape,
      },
    },
    async (rawArgs) => {
      const { categories } = ctx.services;

      switch (rawArgs.action) {
        case 'list': {
          const scope = await requireScope(ctx.token, 'pocketly:read');
          if (!scope.ok) return errorResult(scope.message);
          const query = paginationQuerySchema.parse(rawArgs);
          return textResult(await categories.findAll(ctx.user._id, query));
        }
        case 'get': {
          const scope = await requireScope(ctx.token, 'pocketly:read');
          if (!scope.ok) return errorResult(scope.message);
          if (!rawArgs.id)
            return errorResult('"id" is required for action "get"');
          return textResult(await categories.findOne(ctx.user._id, rawArgs.id));
        }
        case 'create': {
          const scope = await requireScope(ctx.token, 'pocketly:write');
          if (!scope.ok) return errorResult(scope.message);
          const parsed = createCategorySchema.safeParse(rawArgs);
          if (!parsed.success) return errorResult(parsed.error.message);
          return textResult(categories.create(ctx.user._id, parsed.data));
        }
        case 'update': {
          const scope = await requireScope(ctx.token, 'pocketly:write');
          if (!scope.ok) return errorResult(scope.message);
          if (!rawArgs.id)
            return errorResult('"id" is required for action "update"');
          const { id, ...rest } = rawArgs;
          const parsed = updateCategorySchema.safeParse(rest);
          if (!parsed.success) return errorResult(parsed.error.message);
          return textResult(
            await categories.update(ctx.user._id, id, parsed.data),
          );
        }
        case 'delete': {
          const scope = await requireScope(ctx.token, 'pocketly:write');
          if (!scope.ok) return errorResult(scope.message);
          if (!rawArgs.id)
            return errorResult('"id" is required for action "delete"');
          return textResult(await categories.remove(ctx.user._id, rawArgs.id));
        }
      }
    },
  );
}
