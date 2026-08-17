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
import { nextOccurrenceAfter } from '../common/finance/next-occurrence';
import { decodeIdCursor, encodeIdCursor } from '../common/pagination/id-cursor';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { UserDocument } from '../users/schemas/user.schema';
import { CreateRecurrenceDto, UpdateRecurrenceDto } from './dto/recurrence.dto';
import { Recurrence, RecurrenceDocument } from './schemas/recurrence.schema';

@Injectable()
export class RecurrencesService {
  constructor(
    @InjectModel(Recurrence.name)
    private readonly recurrenceModel: Model<RecurrenceDocument>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async create(user: UserDocument, dto: CreateRecurrenceDto) {
    await this.assertOwnedReferences(user._id, dto);

    const timezone = user.timezone || 'UTC';
    const rule = {
      ...dto,
      userId: user._id,
      timezone,
      endDate: dto.endDate ?? null,
    };

    return this.recurrenceModel.create({
      ...rule,
      // Due at the start date itself when that is still ahead of us, so a
      // rule created for "the 1st" doesn't skip its own first occurrence.
      nextRunAt: nextOccurrenceAfter(
        { ...rule, timezone },
        new Date(Date.now() - 1),
      ),
    });
  }

  async findAll(user: UserDocument, query: PaginationQueryDto) {
    const conditions: QueryFilter<RecurrenceDocument>[] = [
      { userId: user._id, deletedAt: null },
    ];
    if (query.cursor) {
      conditions.push({ _id: { $lt: decodeIdCursor(query.cursor) } });
    }

    const rules = await this.recurrenceModel
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

  async update(user: UserDocument, id: string, dto: UpdateRecurrenceDto) {
    const rule = await this.getOwnedOrThrow(user._id, id);
    await this.assertOwnedReferences(user._id, dto);

    Object.assign(rule, dto);

    // Cross-field check that couldn't live on the partial schema: a PATCH
    // may send only one side of the pair.
    if (rule.endDate && rule.endDate < rule.startDate) {
      throw new BadRequestException('endDate must be on or after startDate');
    }

    // Any change to the schedule invalidates the stored nextRunAt.
    if (
      dto.frequency !== undefined ||
      dto.interval !== undefined ||
      dto.startDate !== undefined ||
      dto.endDate !== undefined
    ) {
      rule.nextRunAt = nextOccurrenceAfter(
        rule,
        rule.lastRunAt ?? new Date(Date.now() - 1),
      );
    }

    await rule.save();
    return rule;
  }

  async setPaused(user: UserDocument, id: string, paused: boolean) {
    const rule = await this.getOwnedOrThrow(user._id, id);
    rule.paused = paused;

    // Resuming re-anchors on now, so a rule paused for two months doesn't
    // dump the whole gap into the ledger the moment it comes back.
    if (!paused) {
      rule.nextRunAt = nextOccurrenceAfter(rule, new Date(Date.now() - 1));
    }

    await rule.save();
    return rule;
  }

  async remove(user: UserDocument, id: string) {
    const rule = await this.getOwnedOrThrow(user._id, id);
    rule.deletedAt = new Date();
    // Stop the worker seeing it, independently of the deletedAt filter.
    rule.nextRunAt = null;
    await rule.save();
    return rule;
  }

  private async getOwnedOrThrow(userId: Types.ObjectId, id: string) {
    const rule = await this.recurrenceModel
      .findOne({ _id: id, userId, deletedAt: null })
      .exec();
    if (!rule) throw new NotFoundException('Recurrence not found');
    return rule;
  }

  /**
   * Same ownership rule as the rest of the API: a rule may only point at
   * accounts and categories the caller owns. Checked on write rather than at
   * run time so a bad reference surfaces to the user immediately instead of
   * failing silently inside a worker at 2am.
   */
  private async assertOwnedReferences(
    userId: Types.ObjectId,
    dto: Partial<CreateRecurrenceDto>,
  ) {
    if (dto.accountId) {
      const owned = await this.accountModel.exists({
        _id: dto.accountId,
        userId,
        deletedAt: null,
      });
      if (!owned) throw new BadRequestException('Account not found');
    }

    if (dto.toAccountId) {
      const owned = await this.accountModel.exists({
        _id: dto.toAccountId,
        userId,
        deletedAt: null,
      });
      if (!owned)
        throw new BadRequestException('Destination account not found');
    }

    if (dto.categoryId) {
      const owned = await this.categoryModel.exists({
        _id: dto.categoryId,
        userId,
        deletedAt: null,
      });
      if (!owned) throw new BadRequestException('Category not found');
    }
  }
}
