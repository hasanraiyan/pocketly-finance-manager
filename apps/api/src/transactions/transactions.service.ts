import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { Account, AccountDocument } from '../accounts/schemas/account.schema';
import {
  Category,
  CategoryDocument,
} from '../categories/schemas/category.schema';
import { decodeCursor, encodeCursor } from '../common/pagination/date-cursor';
import { escapeRegExp } from '../common/validation/escape-regexp';
import {
  CreateTransactionDto,
  TransactionQueryDto,
  UpdateTransactionDto,
} from './dto/transaction.dto';
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    private readonly notificationDispatcher: NotificationDispatcherService,
  ) {}

  async create(userId: Types.ObjectId, dto: CreateTransactionDto) {
    await this.assertOwnedReferences(userId, dto);
    const created = await this.transactionModel.create({ ...dto, userId });

    // Asynchronously evaluate budget thresholds in background
    if (dto.type === 'expense' && dto.categoryId) {
      void this.notificationDispatcher.checkBudgetThresholdAfterTransaction(
        userId,
        {
          type: dto.type,
          categoryId: new Types.ObjectId(dto.categoryId),
          amount: dto.amount,
        },
      );
    }

    return created;
  }

  async findAll(userId: Types.ObjectId, query: TransactionQueryDto) {
    const conditions: QueryFilter<TransactionDocument>[] = [
      { userId, deletedAt: null },
    ];

    if (query.type) conditions.push({ type: query.type });
    if (query.categoryId)
      conditions.push({ categoryId: new Types.ObjectId(query.categoryId) });
    if (query.accountId) {
      const accountId = new Types.ObjectId(query.accountId);
      conditions.push({ $or: [{ accountId }, { toAccountId: accountId }] });
    }
    if (query.from) conditions.push({ date: { $gte: query.from } });
    if (query.to) conditions.push({ date: { $lte: query.to } });
    if (query.q) {
      const regex = new RegExp(escapeRegExp(query.q), 'i');
      conditions.push({ $or: [{ description: regex }, { note: regex }] });
    }
    if (query.cursor) {
      const { date, id } = decodeCursor(query.cursor);
      conditions.push({
        $or: [{ date: { $lt: date } }, { date, _id: { $lt: id } }],
      });
    }

    const items = await this.transactionModel
      .find({ $and: conditions })
      .sort({ date: -1, _id: -1 })
      .limit(query.limit + 1)
      .exec();

    const hasMore = items.length > query.limit;
    const page = hasMore ? items.slice(0, query.limit) : items;

    return {
      items: page,
      nextCursor: hasMore ? encodeCursor(page[page.length - 1]) : null,
    };
  }

  async findOne(userId: Types.ObjectId, id: string) {
    return this.getOwnedOrThrow(userId, id);
  }

  async update(userId: Types.ObjectId, id: string, dto: UpdateTransactionDto) {
    const existing = await this.getOwnedOrThrow(userId, id);

    await this.assertOwnedReferences(userId, {
      accountId: dto.accountId ?? existing.accountId.toString(),
      toAccountId: dto.toAccountId ?? existing.toAccountId?.toString(),
      categoryId: dto.categoryId ?? existing.categoryId?.toString(),
    });

    // A partial update's schema refine only validates fields present in
    // *this* request, not the record's final merged state -- so changing
    // `type` without also clearing the now-invalid opposite field
    // (categoryId for transfers, toAccountId otherwise) would leave both
    // set, violating the same invariant create() enforces. Force the
    // exclusive field to match whenever `type` is part of this update.
    const unset: Record<string, 1> = {};
    if (dto.type === 'transfer') {
      unset.categoryId = 1;
    } else if (dto.type) {
      unset.toAccountId = 1;
    }

    const updated = await this.transactionModel
      .findOneAndUpdate(
        { _id: id, userId, deletedAt: null },
        {
          ...dto,
          $inc: { syncVersion: 1 },
          ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
        },
        { new: true },
      )
      .exec();
    if (!updated) throw new NotFoundException('Transaction not found');
    return updated;
  }

  async remove(userId: Types.ObjectId, id: string) {
    const removed = await this.transactionModel
      .findOneAndUpdate(
        { _id: id, userId, deletedAt: null },
        { deletedAt: new Date(), $inc: { syncVersion: 1 } },
        { new: true },
      )
      .exec();
    if (!removed) throw new NotFoundException('Transaction not found');
    return removed;
  }

  async restore(userId: Types.ObjectId, id: string) {
    const restored = await this.transactionModel
      .findOneAndUpdate(
        { _id: id, userId, deletedAt: { $ne: null } },
        { deletedAt: null, $inc: { syncVersion: 1 } },
        { new: true },
      )
      .exec();
    if (!restored) throw new NotFoundException('Deleted transaction not found');
    return restored;
  }

  private async getOwnedOrThrow(userId: Types.ObjectId, id: string) {
    const transaction = await this.transactionModel
      .findOne({ _id: id, userId, deletedAt: null })
      .exec();
    if (!transaction) throw new NotFoundException('Transaction not found');
    return transaction;
  }

  private async assertOwnedReferences(
    userId: Types.ObjectId,
    refs: { accountId: string; toAccountId?: string; categoryId?: string },
  ) {
    const accountIds = [refs.accountId, refs.toAccountId].filter(
      (v): v is string => Boolean(v),
    );
    const accountCount = await this.accountModel.countDocuments({
      _id: { $in: accountIds },
      userId,
      deletedAt: null,
    });
    if (accountCount !== new Set(accountIds).size) {
      throw new BadRequestException('One or more accounts are invalid');
    }

    if (refs.categoryId) {
      const category = await this.categoryModel
        .findOne({ _id: refs.categoryId, userId, deletedAt: null })
        .exec();
      if (!category) throw new BadRequestException('Category is invalid');
    }
  }
}
