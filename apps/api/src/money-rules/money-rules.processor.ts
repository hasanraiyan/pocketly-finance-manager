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
import { GoalsService } from '../goals/goals.service';
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service';
import { BACKGROUND_WORKER_OPTIONS } from '../common/queue/background-worker-options';
import {
  Transaction,
  TransactionDocument,
} from '../transactions/schemas/transaction.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { MoneyRulesService } from './money-rules.service';
import { MoneyRuleDocument } from './schemas/money-rule.schema';

export const MONEY_RULES_QUEUE = 'money-rules';

/** Matches the scheduler's own cadence (`money-rules.scheduler.ts`). */
const LARGE_TRANSACTION_LOOKBACK_HOURS = 6;

/**
 * Evaluates every live money rule and sends what fires.
 *
 * Signals are gathered once per user rather than once per rule -- a query
 * kind (balance, largest transaction, weekly totals, goal progress, category
 * spend) is fetched at most once per user regardless of how many rules of
 * that kind they have, batched by category where there's more than one.
 * Whether a rule actually fires is decided by the pure evaluator, so this
 * class only does I/O.
 */
@Processor(MONEY_RULES_QUEUE, BACKGROUND_WORKER_OPTIONS)
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
      // findAllForContext, not findAll: the latter is the paginated REST
      // list (capped at 100), and a floor alert that silently ignored a
      // user's 101st account could sit un-armed forever.
      const accounts = await this.accounts.findAllForContext(user._id);
      shared.totalBalance = accounts.reduce(
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

    // One aggregation for every category rule this user has, grouped by
    // categoryId, rather than one aggregation per rule -- four category
    // alerts should cost one query, not four.
    const categoryRules = rules.filter((rule) => rule.categoryId);
    if (categoryRules.length > 0) {
      const window = getPeriodWindow('monthly', user.timezone, now);
      const categoryIds = [
        ...new Set(categoryRules.map((rule) => rule.categoryId!.toString())),
      ].map((id) => new Types.ObjectId(id));

      const [categories, spendRows] = await Promise.all([
        this.categoryModel
          .find({ userId: user._id, _id: { $in: categoryIds } })
          .exec(),
        this.transactionModel.aggregate<{ _id: Types.ObjectId; total: number }>(
          [
            {
              $match: {
                userId: user._id,
                deletedAt: null,
                type: 'expense',
                categoryId: { $in: categoryIds },
                date: { $gte: window.start, $lte: window.end },
              },
            },
            { $group: { _id: '$categoryId', total: { $sum: '$amount' } } },
          ],
        ),
      ]);

      const nameById = new Map(
        categories.map((category) => [category._id.toString(), category.name]),
      );
      const spendByCategory = new Map(
        spendRows.map((row) => [row._id.toString(), row.total]),
      );

      for (const rule of categoryRules) {
        const key = rule.categoryId!.toString();
        categorySpend.set(rule._id.toString(), spendByCategory.get(key) ?? 0);
        const name = nameById.get(key);
        if (name) subjects.set(rule._id.toString(), name);
      }
    }

    return { shared, categorySpend, subjects };
  }

  /**
   * The largest expense whose *financial* date falls in the lookback --
   * `date`, not `createdAt`, so a transaction entered today for something
   * that happened last week is judged by when it happened, not when it was
   * typed in. That also means backfilling old records doesn't trigger an
   * alert storm, since their dates fall outside the window even though their
   * `createdAt` would not.
   *
   * The lookback matches the scheduler's own six-hour cadence rather than a
   * full day: a fixed 24-hour window would let the same transaction surface
   * again on every evaluation run until it aged out, since this rule doesn't
   * disarm the way a threshold rule does (see evaluate-money-rule.ts).
   */
  private async largestSince(user: UserDocument, now: Date) {
    const since = new Date(
      now.getTime() - LARGE_TRANSACTION_LOOKBACK_HOURS * 60 * 60 * 1000,
    );
    const [largest] = await this.transactionModel
      .find({
        userId: user._id,
        deletedAt: null,
        type: 'expense',
        date: { $gte: since, $lte: now },
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
