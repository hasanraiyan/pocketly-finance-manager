import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import {
  Category,
  CategoryDocument,
} from '../categories/schemas/category.schema';
import { decodeIdCursor, encodeIdCursor } from '../common/pagination/id-cursor';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { UserDocument } from '../users/schemas/user.schema';
import { CreateMoneyRuleDto, UpdateMoneyRuleDto } from './dto/money-rule.dto';
import { MoneyRule, MoneyRuleDocument } from './schemas/money-rule.schema';

const THRESHOLD_KINDS = ['category_over', 'balance_under', 'large_transaction'];

@Injectable()
export class MoneyRulesService {
  constructor(
    @InjectModel(MoneyRule.name)
    private readonly ruleModel: Model<MoneyRuleDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async create(user: UserDocument, dto: CreateMoneyRuleDto) {
    if (dto.categoryId)
      await this.assertCategoryOwned(user._id, dto.categoryId);
    return this.ruleModel.create({ ...dto, userId: user._id });
  }

  async findAll(user: UserDocument, query: PaginationQueryDto) {
    const conditions: QueryFilter<MoneyRuleDocument>[] = [
      { userId: user._id, deletedAt: null },
    ];
    if (query.cursor) {
      conditions.push({ _id: { $lt: decodeIdCursor(query.cursor) } });
    }

    const rules = await this.ruleModel
      .find({ $and: conditions })
      .sort({ _id: -1 })
      .limit(query.limit + 1)
      .exec();

    const hasMore = rules.length > query.limit;
    const page = hasMore ? rules.slice(0, query.limit) : rules;

    return {
      items: page,
      nextCursor: hasMore ? encodeIdCursor(page[page.length - 1]._id) : null,
    };
  }

  async findOne(user: UserDocument, id: string) {
    return this.getOwnedOrThrow(user._id, id);
  }

  /**
   * Re-validates the *merged* rule rather than the patch: `updateMoneyRuleSchema`
   * is `.partial()`, so a PATCH that only clears the threshold would otherwise
   * leave a threshold rule that can never fire.
   */
  async update(user: UserDocument, id: string, dto: UpdateMoneyRuleDto) {
    const rule = await this.getOwnedOrThrow(user._id, id);
    if (dto.categoryId)
      await this.assertCategoryOwned(user._id, dto.categoryId);

    const merged = { ...rule.toObject(), ...dto };
    if (
      THRESHOLD_KINDS.includes(merged.kind) &&
      !((merged.threshold ?? 0) > 0)
    ) {
      throw new BadRequestException(
        'threshold is required for this kind of rule',
      );
    }
    if (merged.kind === 'category_over' && !merged.categoryId) {
      throw new BadRequestException(
        'categoryId is required for a category rule',
      );
    }

    Object.assign(rule, dto);
    // A retuned threshold has to be able to fire again, even if the old one
    // already had.
    if (dto.threshold !== undefined) rule.armed = true;
    await rule.save();
    return rule;
  }

  async remove(user: UserDocument, id: string) {
    const rule = await this.ruleModel
      .findOneAndUpdate(
        { _id: id, userId: user._id, deletedAt: null },
        { deletedAt: new Date() },
        { new: true },
      )
      .exec();
    if (!rule) throw new NotFoundException('Rule not found');
    return rule;
  }

  /** Every live rule across all users. The worker's entry point. */
  async findAllLive() {
    return this.ruleModel
      .find({ deletedAt: null, enabled: true })
      .sort({ userId: 1 })
      .exec();
  }

  async recordFired(rule: MoneyRuleDocument, armed: boolean, firedAt: Date) {
    rule.armed = armed;
    rule.lastFiredAt = firedAt;
    await rule.save();
  }

  async recordArmed(rule: MoneyRuleDocument, armed: boolean) {
    if (rule.armed === armed) return;
    rule.armed = armed;
    await rule.save();
  }

  private async getOwnedOrThrow(userId: Types.ObjectId, id: string) {
    const rule = await this.ruleModel
      .findOne({ _id: id, userId, deletedAt: null })
      .exec();
    if (!rule) throw new NotFoundException('Rule not found');
    return rule;
  }

  private async assertCategoryOwned(
    userId: Types.ObjectId,
    categoryId: string,
  ) {
    const category = await this.categoryModel
      .findOne({ _id: categoryId, userId, deletedAt: null })
      .exec();
    if (!category) throw new BadRequestException('Category is invalid');
  }
}
