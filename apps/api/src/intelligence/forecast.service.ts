import { Injectable } from '@nestjs/common';
import {
  forecastBalance,
  resolveForecastWindow,
  type ForecastHorizon,
} from '../common/finance/forecast-balance';
import { projectRecurring } from '../common/finance/project-recurring';
import { UserDocument } from '../users/schemas/user.schema';
import {
  FinancialContextService,
  type FinancialContext,
} from './financial-context.service';

@Injectable()
export class ForecastService {
  constructor(private readonly context: FinancialContextService) {}

  async forecast(user: UserDocument, horizon: ForecastHorizon = 'month') {
    const now = new Date();
    const window = resolveForecastWindow(horizon, user.timezone, now);
    const context = await this.context.load(user, {
      window,
      referenceDate: now,
    });

    return { horizon, ...this.fromContext(context) };
  }

  /**
   * Exposed so safe-to-spend, scenarios and the health score run the same
   * projection over a context they have already loaded, rather than each
   * re-reading the database to ask the same question.
   */
  fromContext(context: FinancialContext) {
    const occurrences = projectRecurring(context.rules, context.window);

    return {
      currency: context.currency,
      window: context.window,
      ...forecastBalance({
        openingBalance: context.totalBalance,
        window: context.window,
        occurrences,
        discretionaryDailyRate: context.discretionary.dailyRate,
        timezone: context.timezone,
      }),
    };
  }
}
