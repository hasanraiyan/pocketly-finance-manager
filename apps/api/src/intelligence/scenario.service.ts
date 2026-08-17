import { Injectable } from '@nestjs/common';
import { formatMoney } from '../common/finance/format-money';
import { resolveForecastWindow } from '../common/finance/forecast-balance';
import { projectRecurring } from '../common/finance/project-recurring';
import { defaultReserve } from '../common/finance/safe-to-spend';
import {
  simulateScenario,
  type Scenario,
} from '../common/finance/simulate-scenario';
import { UserDocument } from '../users/schemas/user.schema';
import { FinancialContextService } from './financial-context.service';

@Injectable()
export class ScenarioService {
  constructor(private readonly context: FinancialContextService) {}

  async simulate(user: UserDocument, scenario: Scenario) {
    const now = new Date();
    const window = resolveForecastWindow('month', user.timezone, now);
    const context = await this.context.load(user, {
      window,
      referenceDate: now,
    });

    const result = simulateScenario(
      {
        openingBalance: context.totalBalance,
        window: context.window,
        occurrences: projectRecurring(context.rules, context.window),
        discretionaryDailyRate: context.discretionary.dailyRate,
        timezone: context.timezone,
        budgets: context.budgets,
        goals: context.goals,
        minimumReserve:
          user.minimumReserve ??
          defaultReserve(context.discretionary.dailyRate),
        now: context.now,
      },
      scenario,
      (minor) => formatMoney(minor, context.currency),
    );

    return { currency: context.currency, window: context.window, ...result };
  }
}
