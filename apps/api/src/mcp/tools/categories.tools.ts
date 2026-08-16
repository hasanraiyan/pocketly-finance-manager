import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  createCategorySchema,
  updateCategorySchema,
} from '../../categories/dto/category.dto';
import { paginationQuerySchema } from '../../common/pagination/pagination-query.dto';
import { objectIdSchema } from '../../common/validation/object-id.schema';
import { McpToolContext, requireScope } from '../mcp-context';
import { errorResult, textResult, zodErrorResult } from '../mcp-result';

const DESCRIPTION = `Manage income/expense categories. One tool, five actions via the "action" field:

- list: optional cursor, limit (default 20, max 100).
- get: requires id.
- create: requires name, type (income or expense). Optional: icon, color.
- update: requires id, plus only the fields you want to change (also accepts ignored: true/false to hide/show it without deleting).
- delete: requires id. Fails if the category is in use by an existing transaction or budget -- use update with ignored: true instead if you just want it out of the way.`;

export function registerCategoriesTools(
  server: McpServer,
  ctx: McpToolContext,
): void {
  server.registerTool(
    'manage_category',
    {
      title: 'Manage categories',
      description: DESCRIPTION,
      inputSchema: {
        action: z.enum(['list', 'get', 'create', 'update', 'delete']),
        id: objectIdSchema
          .optional()
          .describe('Category id -- required for get/update/delete'),
        ...paginationQuerySchema.shape,
        ...createCategorySchema.partial().shape,
        ignored: z
          .boolean()
          .optional()
          .describe('update only: hide (true) or show (false) this category'),
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
          if (!parsed.success) return zodErrorResult(parsed.error);
          return textResult(await categories.create(ctx.user._id, parsed.data));
        }
        case 'update': {
          const scope = await requireScope(ctx.token, 'pocketly:write');
          if (!scope.ok) return errorResult(scope.message);
          if (!rawArgs.id)
            return errorResult('"id" is required for action "update"');
          const { id, ...rest } = rawArgs;
          const parsed = updateCategorySchema.safeParse(rest);
          if (!parsed.success) return zodErrorResult(parsed.error);
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
