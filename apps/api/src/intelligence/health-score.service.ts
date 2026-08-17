import { Injectable } from '@nestjs/common';
import { resolveForecastWindow } from '../common/finance/forecast-balance';
import { projectGoal } from '../common/finance/goal-projection';
import { calculateHealthScore } from '../common/finance/health-score';
import { UserDocument } from '../users/schemas/user.schema';
import {
  FinancialContextService,
  type FinancialContext,
} from './financial-context.service';

@Injectable()
export class HealthScoreService {
  constructor(private readonly context: FinancialContextService) {}

  async health(user: UserDocument) {
    const now = new Date();
    const context = await this.context.load(user, {
      window: resolveForecastWindow('month', user.timezone, now),
      referenceDate: now,
    });

    return this.fromContext(context);
  }

  fromContext(context: FinancialContext) {
    return {
      currency: context.currency,
      ...calculateHealthScore({
        months: context.monthlyHistory.map(({ income, expense }) => ({
          income,
          expense,
        })),
        totalBalance: context.totalBalance,
        budgets: context.budgets,
        goals: context.goals.map((goal) => ({
          status: projectGoal({ ...goal, now: context.now }).status,
        })),
      }),
    };
  }
}
