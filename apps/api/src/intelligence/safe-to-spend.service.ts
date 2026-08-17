import { Injectable } from '@nestjs/common';
import { monthlyGoalCommitment } from '../common/finance/goal-projection';
import { resolveForecastWindow } from '../common/finance/forecast-balance';
import {
  projectRecurring,
  sumProjected,
} from '../common/finance/project-recurring';
import {
  calculateSafeToSpend,
  defaultReserve,
  unspentBudgetTotal,
} from '../common/finance/safe-to-spend';
import { UserDocument } from '../users/schemas/user.schema';
import {
  FinancialContextService,
  type FinancialContext,
} from './financial-context.service';

@Injectable()
export class SafeToSpendService {
  constructor(private readonly context: FinancialContextService) {}

  async safeToSpend(user: UserDocument) {
    const now = new Date();
    const window = resolveForecastWindow('month', user.timezone, now);
    const context = await this.context.load(user, {
      window,
      referenceDate: now,
    });

    return this.fromContext(context, user.minimumReserve);
  }

  /**
   * The reserve is the user's own figure when they've set one. When they
   * haven't, it is derived from their spending rather than defaulted to zero:
   * calling an about-to-be-empty account "safe to spend" is the failure mode
   * this whole metric exists to avoid.
   */
  fromContext(context: FinancialContext, minimumReserve?: number | null) {
    const upcoming = sumProjected(
      projectRecurring(context.rules, context.window),
    );
    const reserve =
      minimumReserve ?? defaultReserve(context.discretionary.dailyRate);

    return {
      currency: context.currency,
      window: context.window,
      reserveIsDerived: minimumReserve === null || minimumReserve === undefined,
      ...calculateSafeToSpend({
        totalBalance: context.totalBalance,
        upcomingRecurring: upcoming.expense,
        expectedIncome: upcoming.income,
        budgetCommitments: unspentBudgetTotal(context.budgets),
        goalCommitments: monthlyGoalCommitment(context.goals),
        minimumReserve: reserve,
      }),
    };
  }
}
