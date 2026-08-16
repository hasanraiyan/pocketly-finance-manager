import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import {
  Category,
  CategoryDocument,
} from '../categories/schemas/category.schema';
import { calculateBudgetStatus } from '../common/finance/calculate-budget-status';
import { getPeriodWindow } from '../common/finance/get-period-window';
import { decodeIdCursor, encodeIdCursor } from '../common/pagination/id-cursor';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import {
  Transaction,
  TransactionDocument,
} from '../transactions/schemas/transaction.schema';
import { UserDocument } from '../users/schemas/user.schema';
import { CreateBudgetDto, UpdateBudgetDto } from './dto/budget.dto';
import { Budget, BudgetDocument } from './schemas/budget.schema';

@Injectable()
export class BudgetsService {
  constructor(
    @InjectModel(Budget.name)
    private readonly budgetModel: Model<BudgetDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
  ) {}

  async create(user: UserDocument, dto: CreateBudgetDto) {
    await this.assertExpenseCategoryOwned(user._id, dto.categoryId);
    try {
      const budget = await this.budgetModel.create({
        ...dto,
        userId: user._id,
      });
      return this.withStatus(budget, user.timezone);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'An active budget already exists for this category and period',
        );
      }
      throw error;
    }
  }

  async findAll(user: UserDocument, query: PaginationQueryDto) {
    const conditions: QueryFilter<BudgetDocument>[] = [
      { userId: user._id, deletedAt: null },
    ];
    if (query.cursor) {
      conditions.push({ _id: { $lt: decodeIdCursor(query.cursor) } });
    }

    const budgets = await this.budgetModel
      .find({ $and: conditions })
      .sort({ _id: -1 })
      .limit(query.limit + 1)
      .exec();

    const hasMore = budgets.length > query.limit;
    const page = hasMore ? budgets.slice(0, query.limit) : budgets;
    const items = await Promise.all(
      page.map((budget) => this.withStatus(budget, user.timezone)),
    );

    return {
      items,
      nextCursor: hasMore ? encodeIdCursor(page[page.length - 1]._id) : null,
    };
  }

  async findOne(user: UserDocument, id: string) {
    const budget = await this.getOwnedOrThrow(user._id, id);
    return this.withStatus(budget, user.timezone);
  }

  async update(user: UserDocument, id: string, dto: UpdateBudgetDto) {
    if (dto.categoryId)
      await this.assertExpenseCategoryOwned(user._id, dto.categoryId);
    try {
      const budget = await this.budgetModel
        .findOneAndUpdate({ _id: id, userId: user._id, deletedAt: null }, dto, {
          new: true,
        })
        .exec();
      if (!budget) throw new NotFoundException('Budget not found');
      return this.withStatus(budget, user.timezone);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'An active budget already exists for this category and period',
        );
      }
      throw error;
    }
  }

  async remove(user: UserDocument, id: string) {
    const budget = await this.budgetModel
      .findOneAndUpdate(
        { _id: id, userId: user._id, deletedAt: null },
        { deletedAt: new Date() },
        { new: true },
      )
      .exec();
    if (!budget) throw new NotFoundException('Budget not found');
    return budget;
  }

  private async getOwnedOrThrow(userId: Types.ObjectId, id: string) {
    const budget = await this.budgetModel
      .findOne({ _id: id, userId, deletedAt: null })
      .exec();
    if (!budget) throw new NotFoundException('Budget not found');
    return budget;
  }

  private async assertExpenseCategoryOwned(
    userId: Types.ObjectId,
    categoryId: string,
  ) {
    const category = await this.categoryModel
      .findOne({ _id: categoryId, userId, deletedAt: null })
      .exec();
    if (!category) throw new BadRequestException('Category is invalid');
    if (category.type !== 'expense') {
      throw new BadRequestException(
        'Budgets can only be set on expense categories',
      );
    }
  }

  private async withStatus(budget: BudgetDocument, timezone: string) {
    const { start, end } = getPeriodWindow(budget.period, timezone);
    const [result] = await this.transactionModel.aggregate<{ spent: number }>([
      {
        $match: {
          userId: budget.userId,
          categoryId: budget.categoryId,
          type: 'expense',
          deletedAt: null,
          date: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: null, spent: { $sum: '$amount' } } },
    ]);

    return {
      ...budget.toObject(),
      ...calculateBudgetStatus({
        amount: budget.amount,
        spent: result?.spent ?? 0,
      }),
      periodStart: start,
      periodEnd: end,
    };
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: number }).code === 11000
    );
  }
}
