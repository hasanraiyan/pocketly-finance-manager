import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { clerkClient } from '@clerk/express';
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

export interface ClerkUserProfileUpdate {
  email?: string;
  name?: string;
  imageUrl?: string;
}

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

  async findOrCreateByClerkId(clerkUserId: string): Promise<UserDocument> {
    const existing = await this.userModel.findOne({ clerkUserId }).exec();
    if (existing) {
      return existing;
    }

    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const email =
      clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress ??
      '';
    const name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
      email;

    return this.userModel.create({
      clerkUserId,
      email,
      name,
      imageUrl: clerkUser.imageUrl,
    });
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
   * this user, remove the Pocketly profile, then delete the Clerk identity
   * itself. Irreversible — the caller is responsible for confirming intent
   * before calling this.
   */
  async deleteAccount(user: UserDocument): Promise<void> {
    await this.eraseAllData(user._id);
    await clerkClient.users.deleteUser(user.clerkUserId);
  }

  /**
   * Same erasure as deleteAccount, but triggered by an incoming Clerk
   * `user.deleted` webhook — the Clerk identity is already gone, so this
   * skips the clerkClient.users.deleteUser call. No-ops if we never saw
   * this Clerk user (nothing to clean up).
   */
  async deleteByClerkId(clerkUserId: string): Promise<void> {
    const user = await this.userModel.findOne({ clerkUserId }).exec();
    if (!user) return;
    await this.eraseAllData(user._id);
  }

  /**
   * Syncs profile fields from a Clerk `user.updated` webhook. No-ops if we
   * never saw this Clerk user (they'll be created on their first real API
   * call via findOrCreateByClerkId). Never touches currency/timezone --
   * those are Pocketly-owned, not synced from Clerk.
   */
  async updateFromClerkWebhook(
    clerkUserId: string,
    update: ClerkUserProfileUpdate,
  ): Promise<void> {
    const user = await this.userModel.findOne({ clerkUserId }).exec();
    if (!user) return;

    if (update.email) user.email = update.email;
    if (update.name) user.name = update.name;
    if (update.imageUrl) user.imageUrl = update.imageUrl;
    await user.save();
  }

  private async eraseAllData(userId: UserDocument['_id']): Promise<void> {
    await Promise.all([
      this.accountModel.deleteMany({ userId }),
      this.categoryModel.deleteMany({ userId }),
      this.transactionModel.deleteMany({ userId }),
      this.budgetModel.deleteMany({ userId }),
    ]);
    await this.userModel.deleteOne({ _id: userId });
  }
}
