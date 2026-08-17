import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { AccountsService } from '../accounts/accounts.service';
import { projectGoal } from '../common/finance/goal-projection';
import { decodeIdCursor, encodeIdCursor } from '../common/pagination/id-cursor';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { paginationQuerySchema } from '../common/pagination/pagination-query.dto';
import { UserDocument } from '../users/schemas/user.schema';
import {
  ContributeGoalDto,
  CreateGoalDto,
  UpdateGoalDto,
} from './dto/goal.dto';
import { Goal, GoalDocument } from './schemas/goal.schema';

@Injectable()
export class GoalsService {
  constructor(
    @InjectModel(Goal.name)
    private readonly goalModel: Model<GoalDocument>,
    private readonly accounts: AccountsService,
  ) {}

  async create(user: UserDocument, dto: CreateGoalDto) {
    if (dto.accountId) await this.assertAccountOwned(user, dto.accountId);
    const goal = await this.goalModel.create({ ...dto, userId: user._id });
    return this.withProjection(goal, await this.balancesByAccount(user));
  }

  async findAll(user: UserDocument, query: PaginationQueryDto) {
    const conditions: QueryFilter<GoalDocument>[] = [
      { userId: user._id, deletedAt: null },
    ];
    if (query.cursor) {
      conditions.push({ _id: { $lt: decodeIdCursor(query.cursor) } });
    }

    const goals = await this.goalModel
      .find({ $and: conditions })
      .sort({ _id: -1 })
      .limit(query.limit + 1)
      .exec();

    const hasMore = goals.length > query.limit;
    const page = hasMore ? goals.slice(0, query.limit) : goals;
    const balances = await this.balancesByAccount(user);

    return {
      items: page.map((goal) => this.withProjection(goal, balances)),
      nextCursor: hasMore ? encodeIdCursor(page[page.length - 1]._id) : null,
    };
  }

  async findOne(user: UserDocument, id: string) {
    const goal = await this.getOwnedOrThrow(user._id, id);
    return this.withProjection(goal, await this.balancesByAccount(user));
  }

  async update(user: UserDocument, id: string, dto: UpdateGoalDto) {
    if (dto.accountId) await this.assertAccountOwned(user, dto.accountId);
    const goal = await this.goalModel
      .findOneAndUpdate({ _id: id, userId: user._id, deletedAt: null }, dto, {
        new: true,
      })
      .exec();
    if (!goal) throw new NotFoundException('Goal not found');
    return this.withProjection(goal, await this.balancesByAccount(user));
  }

  async remove(user: UserDocument, id: string) {
    const goal = await this.goalModel
      .findOneAndUpdate(
        { _id: id, userId: user._id, deletedAt: null },
        { deletedAt: new Date() },
        { new: true },
      )
      .exec();
    if (!goal) throw new NotFoundException('Goal not found');
    return goal;
  }

  /**
   * Moves an unlinked goal's progress.
   *
   * Deliberately not a `Transaction`: putting money aside is a transfer the
   * user may already have recorded, and stamping a second record would
   * double-count it in every balance, budget and analysis query -- the same
   * reasoning that keeps recurrence rules out of the transactions collection.
   */
  async contribute(user: UserDocument, id: string, dto: ContributeGoalDto) {
    const goal = await this.getOwnedOrThrow(user._id, id);

    if (goal.accountId) {
      throw new BadRequestException(
        'This goal tracks an account balance — move money into the account instead',
      );
    }

    const next = goal.savedAmount + dto.amount;
    if (next < 0) {
      throw new BadRequestException(
        'That withdrawal is larger than the amount saved',
      );
    }

    goal.savedAmount = next;
    await goal.save();
    return this.withProjection(goal, await this.balancesByAccount(user));
  }

  /**
   * Every live goal with its progress resolved, for the intelligence layer.
   * Unpaginated on purpose -- safe-to-spend has to subtract *all* goal
   * commitments, and a page of them would understate the deduction.
   */
  async findAllForContext(user: UserDocument) {
    const [goals, balances] = await Promise.all([
      this.goalModel.find({ userId: user._id, deletedAt: null }).exec(),
      this.balancesByAccount(user),
    ]);

    return goals.map((goal) => ({
      id: goal._id.toString(),
      name: goal.name,
      kind: goal.kind,
      targetAmount: goal.targetAmount,
      savedAmount: this.progressOf(goal, balances),
      monthlyContribution: goal.monthlyContribution,
      targetDate: goal.targetDate,
    }));
  }

  private async getOwnedOrThrow(userId: Types.ObjectId, id: string) {
    const goal = await this.goalModel
      .findOne({ _id: id, userId, deletedAt: null })
      .exec();
    if (!goal) throw new NotFoundException('Goal not found');
    return goal;
  }

  private async assertAccountOwned(user: UserDocument, accountId: string) {
    try {
      await this.accounts.findOne(user._id, accountId);
    } catch {
      throw new BadRequestException('Account is invalid');
    }
  }

  /**
   * One pass over the account list rather than a lookup per goal: several
   * goals can point at the same account, and balances are aggregations.
   */
  private async balancesByAccount(user: UserDocument) {
    const page = await this.accounts.findAll(
      user._id,
      paginationQuerySchema.parse({ limit: 100 }),
    );
    return new Map(
      page.items.map((account) => [account._id.toString(), account.balance]),
    );
  }

  /**
   * A linked goal's progress *is* the account balance, so the two can never
   * disagree. `savedAmount` is only consulted when there is no account -- or
   * when the linked one has since been deleted, where the last stored figure
   * beats reporting zero.
   */
  private progressOf(goal: GoalDocument, balances: Map<string, number>) {
    if (!goal.accountId) return goal.savedAmount;
    return balances.get(goal.accountId.toString()) ?? goal.savedAmount;
  }

  private withProjection(goal: GoalDocument, balances: Map<string, number>) {
    const progress = this.progressOf(goal, balances);
    const projection = projectGoal({
      targetAmount: goal.targetAmount,
      savedAmount: progress,
      monthlyContribution: goal.monthlyContribution,
      targetDate: goal.targetDate,
    });

    return { ...goal.toObject(), progress, ...projection };
  }
}
