import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { envelopeSchema } from '../../common/http/envelope.schema';

export const userGrowthPointSchema = z.object({
  date: z.string(),
  newUsers: z.number(),
  cumulativeUsers: z.number(),
});

export const transactionFlowPointSchema = z.object({
  month: z.string(),
  incomeTotal: z.number(),
  expenseTotal: z.number(),
  transactionCount: z.number(),
});

export const featureAdoptionSchema = z.object({
  feature: z.string(),
  activeUsers: z.number(),
  adoptionRate: z.number(),
  totalItems: z.number(),
});

export const categoryVolumeSchema = z.object({
  category: z.string(),
  count: z.number(),
});

export const statusVolumeSchema = z.object({
  status: z.string(),
  count: z.number(),
});

export const adminAnalyticsSchema = z.object({
  overview: z.object({
    totalUsers: z.number(),
    activeUsers7d: z.number(),
    activeUsers30d: z.number(),
    newUsers30d: z.number(),
    totalAccounts: z.number(),
    totalTransactions: z.number(),
    totalBudgets: z.number(),
    totalGoals: z.number(),
    completedGoals: z.number(),
    totalMoneyRules: z.number(),
    activeMoneyRules: z.number(),
    totalRecurrences: z.number(),
    activeRecurrences: z.number(),
    mcpConnections: z.number(),
    feedbackCount: z.number(),
    featureRequestCount: z.number(),
  }),
  userGrowth: z.array(userGrowthPointSchema),
  transactionVolumeTrends: z.array(transactionFlowPointSchema),
  featureAdoption: z.array(featureAdoptionSchema),
  accountTypeBreakdown: z.array(
    z.object({
      type: z.string(),
      count: z.number(),
    }),
  ),
  feedbackBreakdown: z.object({
    byCategory: z.array(categoryVolumeSchema),
    byStatus: z.array(statusVolumeSchema),
  }),
});

export class AdminAnalyticsDto extends createZodDto(
  envelopeSchema(adminAnalyticsSchema),
) {}
