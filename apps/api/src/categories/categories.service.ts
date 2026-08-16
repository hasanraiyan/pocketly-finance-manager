import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { Budget, BudgetDocument } from '../budgets/schemas/budget.schema';
import { decodeIdCursor, encodeIdCursor } from '../common/pagination/id-cursor';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import {
  Transaction,
  TransactionDocument,
} from '../transactions/schemas/transaction.schema';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { Category, CategoryDocument } from './schemas/category.schema';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(Budget.name)
    private readonly budgetModel: Model<BudgetDocument>,
  ) {}

  create(userId: Types.ObjectId, dto: CreateCategoryDto) {
    return this.categoryModel.create({ ...dto, userId });
  }

  async findAll(userId: Types.ObjectId, query: PaginationQueryDto) {
    const conditions: QueryFilter<CategoryDocument>[] = [
      { userId, deletedAt: null },
    ];
    if (query.cursor) {
      conditions.push({ _id: { $lt: decodeIdCursor(query.cursor) } });
    }

    const categories = await this.categoryModel
      .find({ $and: conditions })
      .sort({ _id: -1 })
      .limit(query.limit + 1)
      .exec();

    const hasMore = categories.length > query.limit;
    const items = hasMore ? categories.slice(0, query.limit) : categories;

    return {
      items,
      nextCursor: hasMore ? encodeIdCursor(items[items.length - 1]._id) : null,
    };
  }

  async findOne(userId: Types.ObjectId, id: string) {
    const category = await this.categoryModel
      .findOne({ _id: id, userId, deletedAt: null })
      .exec();
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(userId: Types.ObjectId, id: string, dto: UpdateCategoryDto) {
    const category = await this.categoryModel
      .findOneAndUpdate({ _id: id, userId, deletedAt: null }, dto, {
        new: true,
      })
      .exec();
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async remove(userId: Types.ObjectId, id: string) {
    const category = await this.categoryModel
      .findOne({ _id: id, userId, deletedAt: null })
      .exec();
    if (!category) throw new NotFoundException('Category not found');

    const [inUseByTransaction, inUseByBudget] = await Promise.all([
      this.transactionModel.exists({
        categoryId: category._id,
        deletedAt: null,
      }),
      this.budgetModel.exists({ categoryId: category._id, deletedAt: null }),
    ]);

    if (inUseByTransaction || inUseByBudget) {
      throw new ConflictException(
        'Category is in use by existing transactions or budgets; archive it instead of deleting',
      );
    }

    category.deletedAt = new Date();
    await category.save();
    return category;
  }
}
