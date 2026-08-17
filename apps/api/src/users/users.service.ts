import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Account, AccountDocument } from '../accounts/schemas/account.schema';
import { Budget, BudgetDocument } from '../budgets/schemas/budget.schema';
import {
  Category,
  CategoryDocument,
} from '../categories/schemas/category.schema';
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
  ) {}

  async findByClerkId(clerkUserId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ authUserId: clerkUserId }).exec();
  }

  /**
   * `authUserId` holds the Clerk user id (`user_...`). Profiles migrated from
   * the old auth system keep their previous id in `legacyAuthUserId`; the
   * email fallback below is what lets a migrated user land on their existing
   * profile even if the id rewrite missed them.
   */
  async findOrCreateByClerkId(
    authUserId: string,
    email: string,
    name: string,
    imageUrl?: string,
  ): Promise<UserDocument> {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await this.userModel
      .findOne({
        $or: [{ authUserId }, { email: normalizedEmail }],
      })
      .exec();

    if (existing) {
      let needsSave = false;
      if (existing.authUserId !== authUserId) {
        // Matched on email, not id: a pre-Clerk profile being adopted by its
        // Clerk identity. Keep the old id so the two can still be reconciled.
        existing.legacyAuthUserId ??= existing.authUserId;
        existing.authUserId = authUserId;
        needsSave = true;
      }
      if (name && existing.name !== name) {
        existing.name = name;
        needsSave = true;
      }
      if (imageUrl && !existing.imageUrl) {
        existing.imageUrl = imageUrl;
        needsSave = true;
      }
      if (needsSave) {
        await existing.save();
      }
      return existing;
    }

    return this.userModel.create({
      authUserId,
      email: normalizedEmail,
      name,
      imageUrl,
    });
  }

  /**
   * Applies a Clerk `user.updated` event. Only ever touches Clerk-owned
   * fields -- `currency`, `timezone` and `phone` are Pocketly's and must
   * survive a profile edit made in Clerk's UI. No-ops for a Clerk user we've
   * never seen; there is nothing to sync until they call the API.
   */
  async syncFromClerk(
    clerkUserId: string,
    fields: { email?: string; name?: string; imageUrl?: string },
  ): Promise<void> {
    const user = await this.findByClerkId(clerkUserId);
    if (!user) return;

    if (fields.email) user.email = fields.email.toLowerCase().trim();
    if (fields.name) user.name = fields.name;
    if (fields.imageUrl) user.imageUrl = fields.imageUrl;

    await user.save();
  }

  /**
   * Applies a Clerk `user.deleted` event: same erasure as `DELETE /users/me`,
   * minus the call back to Clerk to delete an identity that is already gone.
   */
  async eraseByClerkId(clerkUserId: string): Promise<void> {
    const user = await this.findByClerkId(clerkUserId);
    if (!user) return;
    await this.deleteAccount(user);
  }

  async updateProfile(
    user: UserDocument,
    dto: UpdateProfileDto,
  ): Promise<UserDocument> {
    Object.assign(user, dto);
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
    ]);
    await this.userModel.deleteOne({ _id: user._id });
  }
}
