import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { MONEY_RULE_KINDS } from '../../common/finance/evaluate-money-rule';
import { objectIdSchema } from '../../common/validation/object-id.schema';

/**
 * Optional rather than `.default()`: a Zod default lands in the schema's
 * *output* type, which makes the field required in the generated OpenAPI
 * request body -- so a PATCH that only flips `enabled` would have to resend
 * the cadence too. The Mongoose schema owns these defaults instead.
 */
export const moneyRuleFields = {
  kind: z.enum(MONEY_RULE_KINDS),
  threshold: z.number().int().positive().nullish(),
  categoryId: objectIdSchema.nullish(),
  enabled: z.boolean().optional(),
  cadenceDays: z.number().int().min(1).max(90).optional(),
};

/**
 * A threshold rule without a threshold would watch nothing and never fire --
 * which the user would read as "the alert is broken", not "I misconfigured
 * it". Rejected at the edge instead.
 */
const requiresThreshold = (dto: { kind: string; threshold?: number | null }) =>
  !['category_over', 'balance_under', 'large_transaction'].includes(dto.kind) ||
  (dto.threshold ?? 0) > 0;

export const createMoneyRuleSchema = z
  .object(moneyRuleFields)
  .refine(requiresThreshold, {
    message: 'threshold is required for this kind of rule',
    path: ['threshold'],
  })
  .refine((dto) => dto.kind !== 'category_over' || Boolean(dto.categoryId), {
    message: 'categoryId is required for a category rule',
    path: ['categoryId'],
  });

// Partial before refine, for the same reason recurrences do it: a refinement
// can't be applied and then relaxed. The service re-checks the merged shape.
export const updateMoneyRuleSchema = z.object(moneyRuleFields).partial();

export class CreateMoneyRuleDto extends createZodDto(createMoneyRuleSchema) {}
export class UpdateMoneyRuleDto extends createZodDto(updateMoneyRuleSchema) {}
