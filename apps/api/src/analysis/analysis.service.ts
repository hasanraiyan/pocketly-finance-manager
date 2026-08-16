import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Account, AccountDocument } from '../accounts/schemas/account.schema';
import { resolveAnalysisRange } from '../common/finance/resolve-analysis-range';
import {
  Transaction,
  TransactionDocument,
} from '../transactions/schemas/transaction.schema';
import { UserDocument } from '../users/schemas/user.schema';
import { AnalysisQueryDto } from './dto/analysis-query.dto';

@Injectable()
export class AnalysisService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
  ) {}

  async getOverview(user: UserDocument, query: AnalysisQueryDto) {
    const range = this.resolveRange(user, query);
    const rows = await this.transactionModel.aggregate<{
      _id: 'income' | 'expense';
      total: number;
    }>([
      { $match: this.baseMatch(user, range) },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]);

    const income = rows.find((r) => r._id === 'income')?.total ?? 0;
    const expense = rows.find((r) => r._id === 'expense')?.total ?? 0;

    return { period: range, income, expense, net: income - expense };
  }

  async getCategoryBreakdown(user: UserDocument, query: AnalysisQueryDto) {
    const range = this.resolveRange(user, query);
    const rows = await this.transactionModel.aggregate<{
      _id: { categoryId: string; type: 'income' | 'expense' };
      total: number;
    }>([
      { $match: this.baseMatch(user, range) },
      {
        $group: {
          _id: { categoryId: '$categoryId', type: '$type' },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { total: -1 } },
    ]);

    return {
      period: range,
      categories: rows.map((row) => ({
        categoryId: row._id.categoryId,
        type: row._id.type,
        total: row.total,
      })),
    };
  }

  async getCashFlow(user: UserDocument, query: AnalysisQueryDto) {
    const range = this.resolveRange(user, query);
    const rows = await this.transactionModel.aggregate<{
      _id: { day: string; type: 'income' | 'expense' };
      total: number;
    }>([
      { $match: this.baseMatch(user, range) },
      {
        $group: {
          _id: {
            day: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$date',
                timezone: user.timezone,
              },
            },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.day': 1 } },
    ]);

    const byDay = new Map<string, { income: number; expense: number }>();
    for (const row of rows) {
      const entry = byDay.get(row._id.day) ?? { income: 0, expense: 0 };
      entry[row._id.type] = row.total;
      byDay.set(row._id.day, entry);
    }

    return {
      period: range,
      days: [...byDay.entries()].map(([date, { income, expense }]) => ({
        date,
        income,
        expense,
        net: income - expense,
      })),
    };
  }

  async getAccountBreakdown(user: UserDocument, query: AnalysisQueryDto) {
    const range = this.resolveRange(user, query);
    const [rows, accounts] = await Promise.all([
      this.transactionModel.aggregate<{
        _id: {
          accountId: import('mongoose').Types.ObjectId;
          type: 'income' | 'expense';
        };
        total: number;
      }>([
        { $match: this.baseMatch(user, range) },
        {
          $group: {
            _id: { accountId: '$accountId', type: '$type' },
            total: { $sum: '$amount' },
          },
        },
      ]),
      this.accountModel.find({ userId: user._id, deletedAt: null }).exec(),
    ]);

    return {
      period: range,
      accounts: accounts.map((account) => {
        const income =
          rows.find(
            (r) =>
              r._id.accountId.equals(account._id) && r._id.type === 'income',
          )?.total ?? 0;
        const expense =
          rows.find(
            (r) =>
              r._id.accountId.equals(account._id) && r._id.type === 'expense',
          )?.total ?? 0;
        return { accountId: account._id, name: account.name, income, expense };
      }),
    };
  }

  private resolveRange(user: UserDocument, query: AnalysisQueryDto) {
    return resolveAnalysisRange(query.period, user.timezone, {
      from: query.from,
      to: query.to,
    });
  }

  private baseMatch(user: UserDocument, range: { start: Date; end: Date }) {
    return {
      userId: user._id,
      deletedAt: null,
      type: { $in: ['income', 'expense'] as const },
      date: { $gte: range.start, $lte: range.end },
    };
  }
}
