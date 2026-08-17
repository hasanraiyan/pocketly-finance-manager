import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Budget, BudgetDocument } from '../budgets/schemas/budget.schema';
import {
  Category,
  CategoryDocument,
} from '../categories/schemas/category.schema';
import { formatMoney } from '../common/finance/format-money';
import {
  budgetPaceInsight,
  categorySpikeInsight,
  forecastShortfallInsight,
  goalDelayInsight,
  largestExpenseInsight,
  netNegativeInsight,
  positiveTrendInsight,
  rankInsights,
  recurringGrowthInsight,
  recurringLoadInsight,
  savingsOpportunityInsight,
  type Insight,
} from '../common/finance/insight-rules';
import {
  monthlyGoalCommitment,
  projectGoal,
} from '../common/finance/goal-projection';
import { FinancialContextService } from '../intelligence/financial-context.service';
import { ForecastService } from '../intelligence/forecast.service';
import { getPeriodWindow } from '../common/finance/get-period-window';
import { monthlyCommitment } from '../common/finance/project-recurring';
import { resolveAnalysisRange } from '../common/finance/resolve-analysis-range';
import {
  Recurrence,
  RecurrenceDocument,
} from '../recurrences/schemas/recurrence.schema';
import {
  Transaction,
  TransactionDocument,
} from '../transactions/schemas/transaction.schema';
import { UserDocument } from '../users/schemas/user.schema';
import { AnalysisQueryDto } from './dto/analysis-query.dto';

/** How many complete months of history the spike rule averages over. */
const HISTORY_MONTHS = 3;

/**
 * Insights are arithmetic over data the user already has -- no model, no
 * inference cost, and structurally incapable of inventing a number: a rule
 * either fires from real aggregates or stays silent.
 */
@Injectable()
export class InsightsService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Budget.name)
    private readonly budgetModel: Model<BudgetDocument>,
    @InjectModel(Recurrence.name)
    private readonly recurrenceModel: Model<RecurrenceDocument>,
    private readonly context: FinancialContextService,
    private readonly forecastService: ForecastService,
  ) {}

  async getInsights(user: UserDocument, query: AnalysisQueryDto) {
    const range = resolveAnalysisRange(query.period, user.timezone, {
      from: query.from,
      to: query.to,
    });
    const format = (minor: number) => formatMoney(minor, user.currency);

    const [
      totals,
      categorySpend,
      history,
      largest,
      budgets,
      recurrences,
      context,
      recurringActual,
    ] = await Promise.all([
      this.periodTotals(user, range),
      this.spendByCategory(user, range),
      this.historyByCategory(user, range),
      this.largestExpense(user, range),
      this.budgetPace(user),
      this.recurringLoad(user),
      this.context.load(user),
      this.recurringActualAverage(user),
    ]);

    const forecast = this.forecastService.fromContext(context);
    const goalInsights = context.goals.map((goal) =>
      goalDelayInsight(
        { name: goal.name, ...projectGoal({ ...goal, now: context.now }) },
        format,
      ),
    );

    const categories = await this.categoryModel
      .find({ userId: user._id, deletedAt: null })
      .exec();
    const nameById = new Map(categories.map((c) => [c._id.toString(), c.name]));

    const spikes = categorySpend.map((spend) =>
      categorySpikeInsight(
        {
          categoryId: spend.categoryId,
          name: nameById.get(spend.categoryId) ?? 'Uncategorised',
          total: spend.total,
          averageTotal: history.get(spend.categoryId)?.average ?? 0,
          monthsOfHistory: history.get(spend.categoryId)?.months ?? 0,
        },
        format,
      ),
    );

    const insights: Array<Insight | null> = [
      forecastShortfallInsight(forecast, format),
      ...budgets.map((pace) => budgetPaceInsight(pace, format)),
      ...goalInsights,
      ...spikes,
      netNegativeInsight(totals, format),
      recurringGrowthInsight(recurrences.monthlyTotal, recurringActual, format),
      recurringLoadInsight(recurrences.monthlyTotal, recurrences.count, format),
      savingsOpportunityInsight(
        totals,
        monthlyGoalCommitment(context.goals),
        format,
      ),
      positiveTrendInsight(
        totals.expense,
        this.expectedExpenseByNow(context),
        format,
      ),
      largestExpenseInsight(largest, totals.expense, format),
    ];

    return { period: range, insights: rankInsights(insights) };
  }

  /**
   * What a typical month's spending would have reached by today.
   *
   * Pro-rated deliberately: comparing a half-finished month against whole
   * ones would congratulate every user on the 10th of every month.
   */
  private expectedExpenseByNow(
    context: Awaited<ReturnType<FinancialContextService['load']>>,
  ): number {
    const months = context.monthlyHistory;
    if (months.length === 0) return 0;

    const average =
      months.reduce((sum, month) => sum + month.expense, 0) / months.length;

    const monthStart = getPeriodWindow(
      'monthly',
      context.timezone,
      context.now,
    );
    const msPerDay = 24 * 60 * 60 * 1000;
    const elapsed = Math.max(
      1,
      (context.now.getTime() - monthStart.start.getTime()) / msPerDay,
    );
    const total = Math.max(
      1,
      (monthStart.end.getTime() - monthStart.start.getTime()) / msPerDay,
    );

    return Math.round(average * Math.min(1, elapsed / total));
  }

  /**
   * Mean recurring spend per complete month, taken from what the rules
   * actually posted rather than from the rules themselves -- a rule created
   * yesterday has no history, and treating its full monthly value as "before"
   * would make every new subscription look like a cut.
   */
  private async recurringActualAverage(user: UserDocument): Promise<number> {
    const month = getPeriodWindow('monthly', user.timezone);
    const start = new Date(month.start);
    start.setMonth(start.getMonth() - HISTORY_MONTHS);

    const rows = await this.transactionModel.aggregate<{
      _id: string;
      total: number;
    }>([
      {
        $match: {
          userId: user._id,
          deletedAt: null,
          type: 'expense',
          recurrenceId: { $ne: null },
          date: { $gte: start, $lt: month.start },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m',
              date: '$date',
              timezone: user.timezone,
            },
          },
          total: { $sum: '$amount' },
        },
      },
    ]);

    if (rows.length === 0) return 0;
    return rows.reduce((sum, row) => sum + row.total, 0) / rows.length;
  }

  private async periodTotals(
    user: UserDocument,
    range: { start: Date; end: Date },
  ) {
    const rows = await this.transactionModel.aggregate<{
      _id: 'income' | 'expense';
      total: number;
    }>([
      { $match: this.match(user, range) },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]);

    return {
      income: rows.find((r) => r._id === 'income')?.total ?? 0,
      expense: rows.find((r) => r._id === 'expense')?.total ?? 0,
    };
  }

  private async spendByCategory(
    user: UserDocument,
    range: { start: Date; end: Date },
  ) {
    const rows = await this.transactionModel.aggregate<{
      _id: Types.ObjectId | null;
      total: number;
    }>([
      { $match: { ...this.match(user, range), type: 'expense' } },
      { $group: { _id: '$categoryId', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]);

    return rows
      .filter((row) => row._id !== null)
      .map((row) => ({ categoryId: row._id!.toString(), total: row.total }));
  }

  /**
   * Mean monthly spend per category over the months *before* this period.
   * Excludes the current period deliberately -- comparing a period against
   * an average that includes itself flattens exactly the spike we're
   * looking for.
   */
  private async historyByCategory(
    user: UserDocument,
    range: { start: Date; end: Date },
  ) {
    const historyStart = new Date(range.start);
    historyStart.setMonth(historyStart.getMonth() - HISTORY_MONTHS);

    const rows = await this.transactionModel.aggregate<{
      _id: { categoryId: Types.ObjectId | null; month: string };
      total: number;
    }>([
      {
        $match: {
          userId: user._id,
          deletedAt: null,
          type: 'expense',
          date: { $gte: historyStart, $lt: range.start },
        },
      },
      {
        $group: {
          _id: {
            categoryId: '$categoryId',
            month: {
              $dateToString: {
                format: '%Y-%m',
                date: '$date',
                timezone: user.timezone,
              },
            },
          },
          total: { $sum: '$amount' },
        },
      },
    ]);

    const byCategory = new Map<string, number[]>();
    for (const row of rows) {
      if (!row._id.categoryId) continue;
      const key = row._id.categoryId.toString();
      byCategory.set(key, [...(byCategory.get(key) ?? []), row.total]);
    }

    return new Map(
      [...byCategory.entries()].map(([categoryId, monthlyTotals]) => [
        categoryId,
        {
          months: monthlyTotals.length,
          average:
            monthlyTotals.reduce((sum, total) => sum + total, 0) /
            monthlyTotals.length,
        },
      ]),
    );
  }

  private async largestExpense(
    user: UserDocument,
    range: { start: Date; end: Date },
  ) {
    const [largest] = await this.transactionModel
      .find({ ...this.match(user, range), type: 'expense' })
      .sort({ amount: -1 })
      .limit(1)
      .exec();

    if (!largest) return null;
    return {
      description: largest.description?.trim() || 'An expense',
      amount: largest.amount,
    };
  }

  /**
   * Budget pace uses each budget's own period window rather than the
   * requested analysis range: a monthly budget is about this month whatever
   * range the dashboard happens to be showing.
   */
  private async budgetPace(user: UserDocument) {
    const budgets = await this.budgetModel
      .find({ userId: user._id, deletedAt: null })
      .exec();
    if (budgets.length === 0) return [];

    const categories = await this.categoryModel
      .find({ userId: user._id, deletedAt: null })
      .exec();
    const nameById = new Map(categories.map((c) => [c._id.toString(), c.name]));

    const now = new Date();
    return Promise.all(
      budgets.map(async (budget) => {
        const window = getPeriodWindow(budget.period, user.timezone, now);
        const [row] = await this.transactionModel.aggregate<{
          spent: number;
        }>([
          {
            $match: {
              userId: user._id,
              deletedAt: null,
              type: 'expense',
              categoryId: budget.categoryId,
              date: { $gte: window.start, $lte: window.end },
            },
          },
          { $group: { _id: null, spent: { $sum: '$amount' } } },
        ]);

        const msPerDay = 24 * 60 * 60 * 1000;
        const daysInPeriod = Math.max(
          1,
          Math.round(
            (window.end.getTime() - window.start.getTime()) / msPerDay,
          ),
        );
        const daysElapsed = Math.max(
          1,
          Math.ceil((now.getTime() - window.start.getTime()) / msPerDay),
        );

        return {
          categoryName:
            nameById.get(budget.categoryId.toString()) ?? 'A category',
          limit: budget.amount,
          spent: row?.spent ?? 0,
          daysElapsed,
          daysInPeriod,
        };
      }),
    );
  }

  private async recurringLoad(user: UserDocument) {
    const rules = await this.recurrenceModel
      .find({
        userId: user._id,
        deletedAt: null,
        paused: false,
        type: 'expense',
      })
      .exec();

    const { count, total } = monthlyCommitment(
      rules.map((rule) => ({
        id: rule._id.toString(),
        type: rule.type,
        amount: rule.amount,
        frequency: rule.frequency,
        interval: rule.interval,
        startDate: rule.startDate,
        endDate: rule.endDate,
        timezone: rule.timezone,
        paused: rule.paused,
      })),
      'expense',
    );

    return { count, monthlyTotal: total };
  }

  private match(user: UserDocument, range: { start: Date; end: Date }) {
    return {
      userId: user._id,
      deletedAt: null,
      date: { $gte: range.start, $lte: range.end },
    };
  }
}
