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

  /**
   * Full account deletion (SRS §64): erase every financial record owned by
   * this user, remove the Pocketly profile, then delete the Clerk identity
   * itself. Irreversible — the caller is responsible for confirming intent
   * before calling this.
   */
  async deleteAccount(user: UserDocument): Promise<void> {
    await Promise.all([
      this.accountModel.deleteMany({ userId: user._id }),
      this.categoryModel.deleteMany({ userId: user._id }),
      this.transactionModel.deleteMany({ userId: user._id }),
      this.budgetModel.deleteMany({ userId: user._id }),
    ]);

    await this.userModel.deleteOne({ _id: user._id });

    await clerkClient.users.deleteUser(user.clerkUserId);
  }
}
