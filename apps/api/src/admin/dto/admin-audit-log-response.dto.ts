import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { envelopeSchema } from '../../common/http/envelope.schema';
import { paginatedListSchema } from '../../common/pagination/paginated-list.schema';

export const adminAuditLogItemSchema = z.object({
  _id: z.string(),
  adminUserId: z.string(),
  adminEmail: z.string(),
  action: z.string(),
  targetId: z.string(),
  targetType: z.string(),
  details: z.record(z.string(), z.any()),
  ip: z.string().nullable(),
  createdAt: z.string(),
});

export const auditLogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  cursor: z.string().optional(),
  action: z.string().optional(),
});

export class AuditLogQueryDto extends createZodDto(auditLogQuerySchema) {}
export class AdminAuditLogDto extends createZodDto(
  envelopeSchema(adminAuditLogItemSchema),
) {}
export class AdminAuditLogListDto extends createZodDto(
  envelopeSchema(paginatedListSchema(adminAuditLogItemSchema)),
) {}
