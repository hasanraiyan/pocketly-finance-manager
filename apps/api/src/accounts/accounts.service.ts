import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { calculateBalance } from '../common/finance/calculate-balance';
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

  create(userId: Types.ObjectId, dto: CreateAccountDto) {
    return this.accountModel.create({ ...dto, userId });
  }

  async findAll(userId: Types.ObjectId) {
    const accounts = await this.accountModel
      .find({ userId, deletedAt: null })
      .exec();
    return Promise.all(accounts.map((account) => this.withBalance(account)));
  }

  async findOne(userId: Types.ObjectId, id: string) {
    const account = await this.getOwnedOrThrow(userId, id);
    return this.withBalance(account);
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
