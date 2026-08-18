import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { envelopeSchema } from '../../common/http/envelope.schema';
import { paginatedListSchema } from '../../common/pagination/paginated-list.schema';
import { userSchema } from '../../users/dto/user-response.dto';

export const updateUserRoleSchema = z.object({
  role: z.enum(['user', 'admin']),
});

export const adminUserQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  cursor: z.string().optional(),
  search: z.string().trim().optional(),
});

export class UpdateUserRoleDto extends createZodDto(updateUserRoleSchema) {}
export class AdminUserQueryDto extends createZodDto(adminUserQuerySchema) {}
export class AdminUserListDto extends createZodDto(
  envelopeSchema(paginatedListSchema(userSchema)),
) {}
