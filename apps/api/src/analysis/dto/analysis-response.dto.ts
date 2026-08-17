import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { envelopeSchema } from '../../common/http/envelope.schema';
import { INSIGHT_KINDS } from '../../common/finance/insight-rules';

const periodSchema = z.object({
  start: z.string(),
  end: z.string(),
});

export const overviewSchema = z.object({
  period: periodSchema,
  income: z.number(),
  expense: z.number(),
  net: z.number(),
});

export const categoryBreakdownSchema = z.object({
  period: periodSchema,
  categories: z.array(
    z.object({
      categoryId: z.string(),
      type: z.enum(['income', 'expense']),
      total: z.number(),
    }),
  ),
});

export const cashFlowSchema = z.object({
  period: periodSchema,
  days: z.array(
    z.object({
      date: z.string(),
      income: z.number(),
      expense: z.number(),
      net: z.number(),
    }),
  ),
});

export const accountBreakdownSchema = z.object({
  period: periodSchema,
  accounts: z.array(
    z.object({
      accountId: z.string(),
      name: z.string(),
      income: z.number(),
      expense: z.number(),
    }),
  ),
});

export class OverviewDto extends createZodDto(envelopeSchema(overviewSchema)) {}
export class CategoryBreakdownDto extends createZodDto(
  envelopeSchema(categoryBreakdownSchema),
) {}
export class CashFlowDto extends createZodDto(envelopeSchema(cashFlowSchema)) {}
export class AccountBreakdownDto extends createZodDto(
  envelopeSchema(accountBreakdownSchema),
) {}

export const insightsSchema = z.object({
  period: periodSchema,
  insights: z.array(
    z.object({
      kind: z.enum(INSIGHT_KINDS),
      weight: z.number(),
      title: z.string(),
      detail: z.string(),
      /** Absent when the insight is purely informational. */
      action: z.string().optional(),
    }),
  ),
});

export class InsightsDto extends createZodDto(envelopeSchema(insightsSchema)) {}
