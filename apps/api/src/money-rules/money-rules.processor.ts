import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AccountsService } from '../accounts/accounts.service';
import {
  Category,
  CategoryDocument,
} from '../categories/schemas/category.schema';
import { errorMessage } from '../common/errors/error-message';
import {
  evaluateMoneyRule,
  type RuleSignals,
} from '../common/finance/evaluate-money-rule';
import { formatMoney } from '../common/finance/format-money';
import { getPeriodWindow } from '../common/finance/get-period-window';
import { projectGoal } from '../common/finance/goal-projection';
import { paginationQuerySchema } from '../common/pagination/pagination-query.dto';
import { GoalsService } from '../goals/goals.service';
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service';
import {
  Transaction,
  TransactionDocument,
} from '../transactions/schemas/transaction.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { MoneyRulesService } from './money-rules.service';
import { MoneyRuleDocument } from './schemas/money-rule.schema';

export const MONEY_RULES_QUEUE = 'money-rules';

/**
 * Evaluates every live money rule and sends what fires.
 *
 * Signals are gathered once per user rather than once per rule -- someone
 * with four category alerts should cost four aggregations, not four full
 * passes over their finances. Whether a rule actually fires is decided by the
 * pure evaluator, so this class only does I/O.
 */
@Processor(MONEY_RULES_QUEUE)
export class MoneyRulesProcessor extends WorkerHost {
  private readonly logger = new Logger(MoneyRulesProcessor.name);

  constructor(
    private readonly rules: MoneyRulesService,
    private readonly accounts: AccountsService,
    private readonly goals: GoalsService,
    private readonly dispatcher: NotificationDispatcherService,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {
    super();
  }

  async process(): Promise<{ evaluated: number; fired: number }> {
    const now = new Date();
    const live = await this.rules.findAllLive();
    if (live.length === 0) return { evaluated: 0, fired: 0 };

    const byUser = new Map<string, MoneyRuleDocument[]>();
    for (const rule of live) {
      const key = rule.userId.toString();
      byUser.set(key, [...(byUser.get(key) ?? []), rule]);
    }

    let fired = 0;
    for (const [userId, rules] of byUser) {
      try {
        fired += await this.runForUser(userId, rules, now);
      } catch (error) {
        // One user's bad data must not stop everyone else's alerts.
        this.logger.error(
          `Money rules for user ${userId} failed: ${errorMessage(error)}`,
        );
      }
    }

    this.logger.log(
      `Money rules: ${fired} alert(s) from ${live.length} rule(s)`,
    );
    return { evaluated: live.length, fired };
  }

  private async runForUser(
    userId: string,
    rules: MoneyRuleDocument[],
    now: Date,
  ): Promise<number> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) return 0;

    const format = (minor: number) => formatMoney(minor, user.currency);
    const signals = await this.gatherSignals(user, rules, now);

    let fired = 0;
    for (const rule of rules) {
      const outcome = evaluateMoneyRule(
        {
          kind: rule.kind,
          threshold: rule.threshold,
          subject: signals.subjects.get(rule._id.toString()),
          armed: rule.armed,
          lastFiredAt: rule.lastFiredAt,
          cadenceDays: rule.cadenceDays,
        },
        {
          ...signals.shared,
          categorySpend: signals.categorySpend.get(rule._id.toString()),
        },
        format,
        now,
      );

      if (!outcome.fire || !outcome.notification) {
        await this.rules.recordArmed(rule, outcome.armed);
        continue;
      }

      await this.dispatcher.enqueueNotification(user._id, {
        title: outcome.notification.title,
        body: outcome.notification.body,
        type: rule.kind === 'goal_progress' ? 'GOAL_PROGRESS' : 'MONEY_RULE',
        actionUrl: outcome.notification.actionUrl,
        data: { ruleId: rule._id.toString(), kind: rule.kind },
      });
      await this.rules.recordFired(rule, outcome.armed, now);
      fired += 1;
    }

    return fired;
  }

  /**
   * Reads only what this user's rules actually need. A user with a single
   * weekly digest should not pay for a balance aggregation across every
   * account.
   */
  private async gatherSignals(
    user: UserDocument,
    rules: MoneyRuleDocument[],
    now: Date,
  ) {
    const kinds = new Set(rules.map((rule) => rule.kind));
    const shared: RuleSignals = {};
    const categorySpend = new Map<string, number>();
    const subjects = new Map<string, string>();

    if (kinds.has('balance_under')) {
      const page = await this.accounts.findAll(
        user._id,
        paginationQuerySchema.parse({ limit: 100 }),
      );
      shared.totalBalance = page.items.reduce(
        (sum, account) => sum + account.balance,
        0,
      );
    }

    if (kinds.has('large_transaction')) {
      shared.largestTransaction = await this.largestSince(user, now);
    }

    if (kinds.has('weekly_summary')) {
      shared.weekly = await this.weeklyTotals(user, now);
    }

    if (kinds.has('goal_progress')) {
      const goals = await this.goals.findAllForContext(user);
      shared.goals = goals.map((goal) => {
        const projection = projectGoal({ ...goal, now });
        return {
          name: goal.name,
          percentComplete: projection.percentComplete,
          onTrack: projection.onTrack,
        };
      });
    }

    const categoryRules = rules.filter((rule) => rule.categoryId);
    if (categoryRules.length > 0) {
      const window = getPeriodWindow('monthly', user.timezone, now);
      const categories = await this.categoryModel
        .find({
          userId: user._id,
          _id: { $in: categoryRules.map((rule) => rule.categoryId) },
        })
        .exec();
      const nameById = new Map(
        categories.map((category) => [category._id.toString(), category.name]),
      );

      for (const rule of categoryRules) {
        const spend = await this.categorySpend(
          user,
          rule.categoryId as Types.ObjectId,
          window,
        );
        categorySpend.set(rule._id.toString(), spend);
        const name = nameById.get(rule.categoryId!.toString());
        if (name) subjects.set(rule._id.toString(), name);
      }
    }

    return { shared, categorySpend, subjects };
  }

  private async categorySpend(
    user: UserDocument,
    categoryId: Types.ObjectId,
    window: { start: Date; end: Date },
  ): Promise<number> {
    const [row] = await this.transactionModel.aggregate<{ total: number }>([
      {
        $match: {
          userId: user._id,
          categoryId,
          type: 'expense',
          deletedAt: null,
          date: { $gte: window.start, $lte: window.end },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    return row?.total ?? 0;
  }

  /**
   * Only transactions recorded since the rule last ran, so an old outlier
   * doesn't re-alert on every pass.
   */
  private async largestSince(user: UserDocument, now: Date) {
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [largest] = await this.transactionModel
      .find({
        userId: user._id,
        deletedAt: null,
        type: 'expense',
        createdAt: { $gte: since },
      })
      .sort({ amount: -1 })
      .limit(1)
      .exec();

    if (!largest) return null;
    return {
      description: largest.description?.trim() || 'An expense',
      amount: largest.amount,
    };
  }

  private async weeklyTotals(user: UserDocument, now: Date) {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const rows = await this.transactionModel.aggregate<{
      _id: 'income' | 'expense';
      total: number;
    }>([
      {
        $match: {
          userId: user._id,
          deletedAt: null,
          type: { $in: ['income', 'expense'] },
          date: { $gte: start, $lte: now },
        },
      },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]);

    return {
      income: rows.find((row) => row._id === 'income')?.total ?? 0,
      expense: rows.find((row) => row._id === 'expense')?.total ?? 0,
    };
  }
}
