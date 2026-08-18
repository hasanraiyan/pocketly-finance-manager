import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Account, AccountDocument } from '../accounts/schemas/account.schema';
import {
  RefreshToken,
  RefreshTokenDocument,
} from '../auth/schemas/refresh-token.schema';
import { Budget, BudgetDocument } from '../budgets/schemas/budget.schema';
import {
  Category,
  CategoryDocument,
} from '../categories/schemas/category.schema';
import { Goal, GoalDocument } from '../goals/schemas/goal.schema';
import { decodeIdCursor, encodeIdCursor } from '../common/pagination/id-cursor';
import {
  Transaction,
  TransactionDocument,
} from '../transactions/schemas/transaction.schema';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(Budget.name)
    private readonly budgetModel: Model<BudgetDocument>,
    @InjectModel(Goal.name)
    private readonly goalModel: Model<GoalDocument>,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  /** Creates the Pocketly profile for a freshly registered account. Password hashing is `AuthService`'s job, not this one's. */
  async register(
    email: string,
    passwordHash: string,
    name: string,
  ): Promise<UserDocument> {
    const normalizedEmail = email.toLowerCase().trim();
    const shouldBeAdmin = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
      .includes(normalizedEmail);

    return this.userModel.create({
      email: normalizedEmail,
      passwordHash,
      name,
      role: shouldBeAdmin ? 'admin' : 'user',
    });
  }

  async updateProfile(
    user: UserDocument,
    dto: UpdateProfileDto,
  ): Promise<UserDocument> {
    const { onboarded, dismissChecklist, ...fields } = dto;
    Object.assign(user, fields);
    if (onboarded) user.onboardedAt = new Date();
    if (dismissChecklist) user.checklistDismissedAt = new Date();
    await user.save();
    return user;
  }

  /**
   * Full account deletion (SRS §64): erase every financial record owned by
   * this user, then the Pocketly profile itself. Irreversible -- the caller
   * is responsible for confirming intent before calling this.
   */
  async deleteAccount(user: UserDocument): Promise<void> {
    await Promise.all([
      this.accountModel.deleteMany({ userId: user._id }),
      this.categoryModel.deleteMany({ userId: user._id }),
      this.transactionModel.deleteMany({ userId: user._id }),
      this.budgetModel.deleteMany({ userId: user._id }),
      this.goalModel.deleteMany({ userId: user._id }),
      this.refreshTokenModel.deleteMany({ userId: user._id }),
    ]);
    await this.userModel.deleteOne({ _id: user._id });
  }

  async findAllUsers(query: {
    limit?: number;
    cursor?: string;
    search?: string;
  }) {
    const filter: Record<string, any> = {};
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
      ];
    }
    if (query.cursor) {
      filter._id = { $lt: decodeIdCursor(query.cursor) };
    }
    const limit = query.limit ?? 50;
    const items = await this.userModel
      .find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .exec();

    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore
      ? encodeIdCursor(page[page.length - 1]._id)
      : null;

    return { items: page, nextCursor };
  }

  async setUserRole(
    userId: string,
    role: 'user' | 'admin',
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(userId, { role }, { new: true })
      .exec();
  }
}
