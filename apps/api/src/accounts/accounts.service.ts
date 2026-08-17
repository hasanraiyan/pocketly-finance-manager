import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { calculateBalance } from '../common/finance/calculate-balance';
import { decodeIdCursor, encodeIdCursor } from '../common/pagination/id-cursor';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import {
  Transaction,
  TransactionDocument,
} from '../transactions/schemas/transaction.schema';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';
import { Account, AccountDocument } from './schemas/account.schema';

@Injectable()
export class AccountsService {
  constructor(
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
  ) {}

  async create(userId: Types.ObjectId, dto: CreateAccountDto) {
    const account = await this.accountModel.create({ ...dto, userId });
    return this.withBalance(account);
  }

  async findAll(userId: Types.ObjectId, query: PaginationQueryDto) {
    const conditions: QueryFilter<AccountDocument>[] = [
      { userId, deletedAt: null },
    ];
    if (query.cursor) {
      conditions.push({ _id: { $lt: decodeIdCursor(query.cursor) } });
    }

    const accounts = await this.accountModel
      .find({ $and: conditions })
      .sort({ _id: -1 })
      .limit(query.limit + 1)
      .exec();

    const hasMore = accounts.length > query.limit;
    const page = hasMore ? accounts.slice(0, query.limit) : accounts;
    const items = await Promise.all(
      page.map((account) => this.withBalance(account)),
    );

    return {
      items,
      nextCursor: hasMore ? encodeIdCursor(page[page.length - 1]._id) : null,
    };
  }

  async findOne(userId: Types.ObjectId, id: string) {
    const account = await this.getOwnedOrThrow(userId, id);
    return this.withBalance(account);
  }

  /**
   * Every live account with its balance, for callers that need a true total
   * -- the forecast, safe-to-spend, the health score, money rules, and the
   * MCP overview. Deliberately not built on `findAll`: that method's
   * pagination caps at 100, which is the right ceiling for a UI list but
   * would silently under-report a user's real balance if reused here.
   *
   * Two aggregations regardless of account count, rather than one per
   * account: a transaction only debits/credits the account it names in
   * `accountId`, but a transfer also credits a *different* account via
   * `toAccountId`, so the two roles need separate `$group` stages -- a
   * document can't land in two buckets from one `$group`.
   */
  async findAllForContext(
    userId: Types.ObjectId,
  ): Promise<Array<{ id: string; name: string; balance: number }>> {
    const accounts = await this.accountModel
      .find({ userId, deletedAt: null })
      .exec();
    if (accounts.length === 0) return [];

    const accountIds = accounts.map((account) => account._id);

    const [ownRows, transferInRows] = await Promise.all([
      this.transactionModel.aggregate<{
        _id: Types.ObjectId;
        income: number;
        expense: number;
        transfersOut: number;
      }>([
        {
          $match: {
            userId,
            deletedAt: null,
            accountId: { $in: accountIds },
          },
        },
        {
          $group: {
            _id: '$accountId',
            income: {
              $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] },
            },
            expense: {
              $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] },
            },
            transfersOut: {
              $sum: { $cond: [{ $eq: ['$type', 'transfer'] }, '$amount', 0] },
            },
          },
        },
      ]),
      this.transactionModel.aggregate<{
        _id: Types.ObjectId;
        transfersIn: number;
      }>([
        {
          $match: {
            userId,
            deletedAt: null,
            type: 'transfer',
            toAccountId: { $in: accountIds },
          },
        },
        { $group: { _id: '$toAccountId', transfersIn: { $sum: '$amount' } } },
      ]),
    ]);

    const byAccount = new Map(ownRows.map((row) => [row._id.toString(), row]));
    const transfersInByAccount = new Map(
      transferInRows.map((row) => [row._id.toString(), row.transfersIn]),
    );

    return accounts.map((account) => {
      const key = account._id.toString();
      const own = byAccount.get(key);
      return {
        id: key,
        name: account.name,
        balance: calculateBalance({
          initialBalance: account.initialBalance,
          income: own?.income ?? 0,
          expense: own?.expense ?? 0,
          transfersOut: own?.transfersOut ?? 0,
          transfersIn: transfersInByAccount.get(key) ?? 0,
        }),
      };
    });
  }

  async update(userId: Types.ObjectId, id: string, dto: UpdateAccountDto) {
    const account = await this.accountModel
      .findOneAndUpdate({ _id: id, userId, deletedAt: null }, dto, {
        new: true,
      })
      .exec();
    if (!account) throw new NotFoundException('Account not found');
    return this.withBalance(account);
  }

  async remove(userId: Types.ObjectId, id: string) {
    const account = await this.accountModel
      .findOneAndUpdate(
        { _id: id, userId, deletedAt: null },
        { deletedAt: new Date() },
        { new: true },
      )
      .exec();
    if (!account) throw new NotFoundException('Account not found');
    return account;
  }

  private async getOwnedOrThrow(userId: Types.ObjectId, id: string) {
    const account = await this.accountModel
      .findOne({ _id: id, userId, deletedAt: null })
      .exec();
    if (!account) throw new NotFoundException('Account not found');
    return account;
  }

  private async withBalance(account: AccountDocument) {
    const balance = await this.getBalance(account._id, account.initialBalance);
    return { ...account.toObject(), balance };
  }

  private async getBalance(
    accountId: Types.ObjectId,
    initialBalance: number,
  ): Promise<number> {
    const [result] = await this.transactionModel.aggregate<{
      income: number;
      expense: number;
      transfersIn: number;
      transfersOut: number;
    }>([
      {
        $match: {
          deletedAt: null,
          $or: [{ accountId }, { toAccountId: accountId }],
        },
      },
      {
        $group: {
          _id: null,
          income: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$type', 'income'] },
                    { $eq: ['$accountId', accountId] },
                  ],
                },
                '$amount',
                0,
              ],
            },
          },
          expense: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$type', 'expense'] },
                    { $eq: ['$accountId', accountId] },
                  ],
                },
                '$amount',
                0,
              ],
            },
          },
          transfersOut: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$type', 'transfer'] },
                    { $eq: ['$accountId', accountId] },
                  ],
                },
                '$amount',
                0,
              ],
            },
          },
          transfersIn: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$type', 'transfer'] },
                    { $eq: ['$toAccountId', accountId] },
                  ],
                },
                '$amount',
                0,
              ],
            },
          },
        },
      },
    ]);

    return calculateBalance({
      initialBalance,
      income: result?.income ?? 0,
      expense: result?.expense ?? 0,
      transfersIn: result?.transfersIn ?? 0,
      transfersOut: result?.transfersOut ?? 0,
    });
  }
}
