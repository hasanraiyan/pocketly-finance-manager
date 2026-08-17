import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AccountsService } from '../accounts/accounts.service';
import { Budget, BudgetDocument } from '../budgets/schemas/budget.schema';
import {
  Category,
  CategoryDocument,
} from '../categories/schemas/category.schema';
import {
  getPeriodWindow,
  type DateRange,
} from '../common/finance/get-period-window';
import type { ProjectableRule } from '../common/finance/project-recurring';
import { paginationQuerySchema } from '../common/pagination/pagination-query.dto';
import { GoalsService } from '../goals/goals.service';
import {
  Recurrence,
  RecurrenceDocument,
} from '../recurrences/schemas/recurrence.schema';
import {
  Transaction,
  TransactionDocument,
} from '../transactions/schemas/transaction.schema';
import { UserDocument } from '../users/schemas/user.schema';

/** How far back the discretionary run-rate averages. */
export const DISCRETIONARY_LOOKBACK_DAYS = 90;

/** Complete months of history the health score judges trends over. */
export const HISTORY_MONTHS = 6;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ContextAccount {
  id: string;
  name: string;
  balance: number;
}

export interface ContextGoal {
  id: string;
  name: string;
  targetAmount: number;
  /** Progress, already resolved from the linked account where there is one. */
  savedAmount: number;
  monthlyContribution: number;
  targetDate: Date | null;
}

export interface ContextBudget {
  id: string;
  categoryId: string;
  categoryName: string;
  limit: number;
  spent: number;
  period: BudgetDocument['period'];
  window: DateRange;
}

/**
 * Everything a projection needs, gathered once.
 *
 * The point of this shape is that nothing downstream touches Mongo: forecast,
 * safe-to-spend, scenarios and the health score are all pure functions of a
 * context, which is what makes them unit-testable and what keeps Web, MCP and
 * the workers computing the same numbers from the same inputs.
 */
export interface FinancialContext {
  now: Date;
  timezone: string;
  currency: string;
  /** The window being projected over -- typically now → end of month. */
  window: DateRange;
  totalBalance: number;
  accounts: ContextAccount[];
  rules: ProjectableRule[];
  budgets: ContextBudget[];
  goals: ContextGoal[];
  /** Actuals for the calendar period the window sits in, so far. */
  periodToDate: { income: number; expense: number; net: number };
  /** Complete months only, oldest first. Excludes the current month. */
  monthlyHistory: Array<{ month: string; income: number; expense: number }>;
  discretionary: {
    /** Mean daily non-recurring expense over the lookback. */
    dailyRate: number;
    lookbackDays: number;
  };
}

export interface LoadContextOptions {
  /** Defaults to now → end of the user's current month. */
  window?: DateRange;
  referenceDate?: Date;
}

@Injectable()
export class FinancialContextService {
  constructor(
    private readonly accounts: AccountsService,
    private readonly goals: GoalsService,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(Recurrence.name)
    private readonly recurrenceModel: Model<RecurrenceDocument>,
    @InjectModel(Budget.name)
    private readonly budgetModel: Model<BudgetDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async load(
    user: UserDocument,
    options: LoadContextOptions = {},
  ): Promise<FinancialContext> {
    const now = options.referenceDate ?? new Date();
    const month = getPeriodWindow('monthly', user.timezone, now);
    // The default forecast window starts at *now*, not at the start of the
    // month: money already spent is in the balance, and projecting it again
    // from the month's start would double-count it.
    const window = options.window ?? { start: now, end: month.end };

    const [
      accounts,
      rules,
      budgets,
      goals,
      periodToDate,
      monthlyHistory,
      discretionary,
    ] = await Promise.all([
      this.loadAccounts(user),
      this.loadRules(user),
      this.loadBudgets(user, now),
      this.goals.findAllForContext(user),
      this.loadPeriodTotals(user, month),
      this.loadMonthlyHistory(user, month),
      this.loadDiscretionaryRate(user, now),
    ]);

    return {
      now,
      timezone: user.timezone,
      currency: user.currency,
      window,
      totalBalance: accounts.reduce((sum, a) => sum + a.balance, 0),
      accounts,
      rules,
      budgets,
      goals,
      periodToDate,
      monthlyHistory,
      discretionary,
    };
  }

  /**
   * Goes through AccountsService rather than the model so balances are
   * computed by the one implementation the rest of the product uses -- a
   * second balance calculation that drifts from `calculateBalance` is exactly
   * the failure this module exists to prevent.
   */
  private async loadAccounts(user: UserDocument): Promise<ContextAccount[]> {
    const page = await this.accounts.findAll(
      user._id,
      paginationQuerySchema.parse({ limit: 100 }),
    );

    return page.items.map((account) => ({
      id: account._id.toString(),
      name: account.name,
      balance: account.balance,
    }));
  }

  private async loadRules(user: UserDocument): Promise<ProjectableRule[]> {
    const rules = await this.recurrenceModel
      .find({ userId: user._id, deletedAt: null, paused: false })
      .exec();

    return rules.map((rule) => ({
      id: rule._id.toString(),
      type: rule.type,
      amount: rule.amount,
      description: rule.description,
      categoryId: rule.categoryId?.toString() ?? null,
      frequency: rule.frequency,
      interval: rule.interval,
      startDate: rule.startDate,
      endDate: rule.endDate,
      timezone: rule.timezone,
      paused: rule.paused,
    }));
  }

  private async loadBudgets(
    user: UserDocument,
    now: Date,
  ): Promise<ContextBudget[]> {
    const budgets = await this.budgetModel
      .find({ userId: user._id, deletedAt: null })
      .exec();
    if (budgets.length === 0) return [];

    const categories = await this.categoryModel
      .find({ userId: user._id, deletedAt: null })
      .exec();
    const nameById = new Map(categories.map((c) => [c._id.toString(), c.name]));

    return Promise.all(
      budgets.map(async (budget) => {
        const window = getPeriodWindow(budget.period, user.timezone, now);
        const [row] = await this.transactionModel.aggregate<{ spent: number }>([
          {
            $match: {
              userId: user._id,
              categoryId: budget.categoryId,
              type: 'expense',
              deletedAt: null,
              date: { $gte: window.start, $lte: window.end },
            },
          },
          { $group: { _id: null, spent: { $sum: '$amount' } } },
        ]);

        return {
          id: budget._id.toString(),
          categoryId: budget.categoryId.toString(),
          categoryName:
            nameById.get(budget.categoryId.toString()) ?? 'A category',
          limit: budget.amount,
          spent: row?.spent ?? 0,
          period: budget.period,
          window,
        };
      }),
    );
  }

  private async loadPeriodTotals(user: UserDocument, month: DateRange) {
    const rows = await this.transactionModel.aggregate<{
      _id: 'income' | 'expense';
      total: number;
    }>([
      {
        $match: {
          userId: user._id,
          deletedAt: null,
          type: { $in: ['income', 'expense'] },
          date: { $gte: month.start, $lte: month.end },
        },
      },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]);

    const income = rows.find((r) => r._id === 'income')?.total ?? 0;
    const expense = rows.find((r) => r._id === 'expense')?.total ?? 0;
    return { income, expense, net: income - expense };
  }

  /**
   * Income and expense per calendar month, in the user's timezone.
   *
   * The current month is excluded on purpose: a trend judged partly on a
   * month that is three days old reads as a collapse in spending every time
   * someone opens the app on the 3rd.
   */
  private async loadMonthlyHistory(user: UserDocument, month: DateRange) {
    const start = new Date(month.start);
    start.setMonth(start.getMonth() - HISTORY_MONTHS);

    const rows = await this.transactionModel.aggregate<{
      _id: { month: string; type: 'income' | 'expense' };
      total: number;
    }>([
      {
        $match: {
          userId: user._id,
          deletedAt: null,
          type: { $in: ['income', 'expense'] },
          date: { $gte: start, $lt: month.start },
        },
      },
      {
        $group: {
          _id: {
            month: {
              $dateToString: {
                format: '%Y-%m',
                date: '$date',
                timezone: user.timezone,
              },
            },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]);

    const byMonth = new Map<string, { income: number; expense: number }>();
    for (const row of rows) {
      const entry = byMonth.get(row._id.month) ?? { income: 0, expense: 0 };
      entry[row._id.type] = row.total;
      byMonth.set(row._id.month, entry);
    }

    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, totals]) => ({ month, ...totals }));
  }

  /**
   * Mean daily spend on everything that *isn't* a recurring rule.
   *
   * Recurring transactions are excluded deliberately: they are projected from
   * their rules, occurrence by occurrence, so including them in the run-rate
   * too would count every subscription twice.
   */
  private async loadDiscretionaryRate(user: UserDocument, now: Date) {
    const start = new Date(
      now.getTime() - DISCRETIONARY_LOOKBACK_DAYS * MS_PER_DAY,
    );

    const [row] = await this.transactionModel.aggregate<{ total: number }>([
      {
        $match: {
          userId: user._id,
          deletedAt: null,
          type: 'expense',
          recurrenceId: null,
          date: { $gte: start, $lte: now },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    return {
      dailyRate: Math.round((row?.total ?? 0) / DISCRETIONARY_LOOKBACK_DAYS),
      lookbackDays: DISCRETIONARY_LOOKBACK_DAYS,
    };
  }
}
