import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Account, AccountDocument } from '../accounts/schemas/account.schema';
import { Budget, BudgetDocument } from '../budgets/schemas/budget.schema';
import { Goal, GoalDocument } from '../goals/schemas/goal.schema';
import {
  McpConnection,
  McpConnectionDocument,
} from '../mcp/schemas/mcp-connection.schema';
import {
  MoneyRule,
  MoneyRuleDocument,
} from '../money-rules/schemas/money-rule.schema';
import {
  Recurrence,
  RecurrenceDocument,
} from '../recurrences/schemas/recurrence.schema';
import {
  Transaction,
  TransactionDocument,
} from '../transactions/schemas/transaction.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  Feedback,
  FeedbackDocument,
} from '../feedback/schemas/feedback.schema';

@Injectable()
export class AdminAnalyticsService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(Budget.name)
    private readonly budgetModel: Model<BudgetDocument>,
    @InjectModel(Goal.name) private readonly goalModel: Model<GoalDocument>,
    @InjectModel(MoneyRule.name)
    private readonly moneyRuleModel: Model<MoneyRuleDocument>,
    @InjectModel(Recurrence.name)
    private readonly recurrenceModel: Model<RecurrenceDocument>,
    @InjectModel(McpConnection.name)
    private readonly mcpConnectionModel: Model<McpConnectionDocument>,
    @InjectModel(Feedback.name)
    private readonly feedbackModel: Model<FeedbackDocument>,
  ) {}

  async getPlatformAnalytics() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsers30d,
      totalAccounts,
      totalTransactions,
      totalBudgets,
      totalGoals,
      completedGoals,
      totalMoneyRules,
      activeMoneyRules,
      totalRecurrences,
      activeRecurrences,
      mcpConnections,
      feedbackCount,
      featureRequestCount,
      activeUsers7dList,
      activeUsers30dList,
      userGrowthRaw,
      transactionFlowRaw,
      accountTypeRaw,
      feedbackCategoryRaw,
      feedbackStatusRaw,
      usersWithAccounts,
      usersWithBudgets,
      usersWithGoals,
      usersWithMoneyRules,
      usersWithRecurrences,
      usersWithMcp,
    ] = await Promise.all([
      this.userModel.countDocuments().exec(),
      this.userModel
        .countDocuments({ createdAt: { $gte: thirtyDaysAgo } })
        .exec(),
      this.accountModel.countDocuments({ deletedAt: null }).exec(),
      this.transactionModel.countDocuments({ deletedAt: null }).exec(),
      this.budgetModel.countDocuments({ deletedAt: null }).exec(),
      this.goalModel.countDocuments({ deletedAt: null }).exec(),
      this.goalModel
        .countDocuments({
          deletedAt: null,
          $expr: { $gte: ['$savedAmount', '$targetAmount'] },
        })
        .exec(),
      this.moneyRuleModel.countDocuments({ deletedAt: null }).exec(),
      this.moneyRuleModel
        .countDocuments({ deletedAt: null, enabled: true })
        .exec(),
      this.recurrenceModel.countDocuments({ deletedAt: null }).exec(),
      this.recurrenceModel
        .countDocuments({ deletedAt: null, enabled: true })
        .exec(),
      this.mcpConnectionModel.countDocuments({ revokedAt: null }).exec(),
      this.feedbackModel
        .countDocuments({ deletedAt: null, type: 'feedback' })
        .exec(),
      this.feedbackModel
        .countDocuments({ deletedAt: null, type: 'feature_request' })
        .exec(),

      // Active users in 7d (distinct users who created/updated transactions)
      this.transactionModel
        .distinct('userId', {
          deletedAt: null,
          date: { $gte: sevenDaysAgo },
        })
        .exec(),

      // Active users in 30d
      this.transactionModel
        .distinct('userId', {
          deletedAt: null,
          date: { $gte: thirtyDaysAgo },
        })
        .exec(),

      // User growth by day (last 30 days)
      this.userModel
        .aggregate<{ _id: string; count: number }>([
          { $match: { createdAt: { $gte: thirtyDaysAgo } } },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .exec(),

      // Aggregate transaction volume trends by month (last 6 months) - strictly anonymized totals
      this.transactionModel
        .aggregate<{
          _id: string;
          incomeTotal: number;
          expenseTotal: number;
          transactionCount: number;
        }>([
          { $match: { deletedAt: null, date: { $gte: sixMonthsAgo } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
              incomeTotal: {
                $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] },
              },
              expenseTotal: {
                $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] },
              },
              transactionCount: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .exec(),

      // Account breakdown by type
      this.accountModel
        .aggregate<{ _id: string; count: number }>([
          { $match: { deletedAt: null } },
          { $group: { _id: '$type', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ])
        .exec(),

      // Feedback by category
      this.feedbackModel
        .aggregate<{ _id: string; count: number }>([
          { $match: { deletedAt: null } },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ])
        .exec(),

      // Feedback by status
      this.feedbackModel
        .aggregate<{ _id: string; count: number }>([
          { $match: { deletedAt: null } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ])
        .exec(),

      // Distinct users per feature for adoption rates
      this.accountModel.distinct('userId', { deletedAt: null }).exec(),
      this.budgetModel.distinct('userId', { deletedAt: null }).exec(),
      this.goalModel.distinct('userId', { deletedAt: null }).exec(),
      this.moneyRuleModel.distinct('userId', { deletedAt: null }).exec(),
      this.recurrenceModel.distinct('userId', { deletedAt: null }).exec(),
      this.mcpConnectionModel.distinct('userId', { revokedAt: null }).exec(),
    ]);

    // Build cumulative user growth
    let runningUsers = Math.max(0, totalUsers - newUsers30d);
    const userGrowth = userGrowthRaw.map((point) => {
      runningUsers += point.count;
      return {
        date: point._id,
        newUsers: point.count,
        cumulativeUsers: runningUsers,
      };
    });

    const transactionVolumeTrends = transactionFlowRaw.map((point) => ({
      month: point._id,
      incomeTotal: point.incomeTotal,
      expenseTotal: point.expenseTotal,
      transactionCount: point.transactionCount,
    }));

    const accountTypeBreakdown = accountTypeRaw.map((item) => ({
      type: item._id || 'other',
      count: item.count,
    }));

    const feedbackByCategory = feedbackCategoryRaw.map((item) => ({
      category: item._id,
      count: item.count,
    }));

    const feedbackByStatus = feedbackStatusRaw.map((item) => ({
      status: item._id,
      count: item.count,
    }));

    // Feature adoption calculations
    const safeUserCount = totalUsers > 0 ? totalUsers : 1;
    const featureAdoption = [
      {
        feature: 'Accounts',
        activeUsers: usersWithAccounts.length,
        adoptionRate: Math.round(
          (usersWithAccounts.length / safeUserCount) * 100,
        ),
        totalItems: totalAccounts,
      },
      {
        feature: 'Transactions',
        activeUsers: activeUsers30dList.length,
        adoptionRate: Math.round(
          (activeUsers30dList.length / safeUserCount) * 100,
        ),
        totalItems: totalTransactions,
      },
      {
        feature: 'Budgets',
        activeUsers: usersWithBudgets.length,
        adoptionRate: Math.round(
          (usersWithBudgets.length / safeUserCount) * 100,
        ),
        totalItems: totalBudgets,
      },
      {
        feature: 'Goals',
        activeUsers: usersWithGoals.length,
        adoptionRate: Math.round((usersWithGoals.length / safeUserCount) * 100),
        totalItems: totalGoals,
      },
      {
        feature: 'Money Rules',
        activeUsers: usersWithMoneyRules.length,
        adoptionRate: Math.round(
          (usersWithMoneyRules.length / safeUserCount) * 100,
        ),
        totalItems: totalMoneyRules,
      },
      {
        feature: 'Recurrences',
        activeUsers: usersWithRecurrences.length,
        adoptionRate: Math.round(
          (usersWithRecurrences.length / safeUserCount) * 100,
        ),
        totalItems: totalRecurrences,
      },
      {
        feature: 'MCP Integration',
        activeUsers: usersWithMcp.length,
        adoptionRate: Math.round((usersWithMcp.length / safeUserCount) * 100),
        totalItems: mcpConnections,
      },
    ];

    return {
      overview: {
        totalUsers,
        activeUsers7d: activeUsers7dList.length,
        activeUsers30d: activeUsers30dList.length,
        newUsers30d,
        totalAccounts,
        totalTransactions,
        totalBudgets,
        totalGoals,
        completedGoals,
        totalMoneyRules,
        activeMoneyRules,
        totalRecurrences,
        activeRecurrences,
        mcpConnections,
        feedbackCount,
        featureRequestCount,
      },
      userGrowth,
      transactionVolumeTrends,
      featureAdoption,
      accountTypeBreakdown,
      feedbackBreakdown: {
        byCategory: feedbackByCategory,
        byStatus: feedbackByStatus,
      },
    };
  }
}
