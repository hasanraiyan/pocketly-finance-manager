import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { MONEY_RULE_KINDS } from '../../common/finance/evaluate-money-rule';
import { envelopeSchema } from '../../common/http/envelope.schema';
import { paginatedListSchema } from '../../common/pagination/paginated-list.schema';

export const moneyRuleSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  kind: z.enum(MONEY_RULE_KINDS),
  threshold: z.number().nullable(),
  categoryId: z.string().nullable(),
  enabled: z.boolean(),
  cadenceDays: z.number(),
  armed: z.boolean(),
  lastFiredAt: z.string().nullable(),
  deletedAt: z.string().nullable(),
  syncVersion: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export class MoneyRuleDto extends createZodDto(
  envelopeSchema(moneyRuleSchema),
) {}
export class MoneyRuleListDto extends createZodDto(
  envelopeSchema(paginatedListSchema(moneyRuleSchema)),
) {}
