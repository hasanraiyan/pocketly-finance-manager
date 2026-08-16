jest.mock('@clerk/express', () => ({
  clerkClient: {
    users: {
      deleteUser: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { clerkClient } from '@clerk/express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model } from 'mongoose';
import { AccountsService } from '../accounts/accounts.service';
import {
  Account,
  AccountDocument,
  AccountSchema,
} from '../accounts/schemas/account.schema';
import { Budget, BudgetSchema } from '../budgets/schemas/budget.schema';
import { CategoriesService } from '../categories/categories.service';
import {
  Category,
  CategoryDocument,
  CategorySchema,
} from '../categories/schemas/category.schema';
import { TransactionsService } from '../transactions/transactions.service';
import {
  Transaction,
  TransactionDocument,
  TransactionSchema,
} from '../transactions/schemas/transaction.schema';
import { User, UserDocument, UserSchema } from './schemas/user.schema';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;
  let usersService: UsersService;
  let accountsService: AccountsService;
  let categoriesService: CategoriesService;
  let transactionsService: TransactionsService;
  let userModel: Model<UserDocument>;
  let accountModel: Model<AccountDocument>;
  let categoryModel: Model<CategoryDocument>;
  let transactionModel: Model<TransactionDocument>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();

    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongod.getUri()),
        MongooseModule.forFeature([
          { name: User.name, schema: UserSchema },
          { name: Account.name, schema: AccountSchema },
          { name: Category.name, schema: CategorySchema },
          { name: Transaction.name, schema: TransactionSchema },
          { name: Budget.name, schema: BudgetSchema },
        ]),
      ],
      providers: [
        UsersService,
        AccountsService,
        CategoriesService,
        TransactionsService,
      ],
    }).compile();

    usersService = moduleRef.get(UsersService);
    accountsService = moduleRef.get(AccountsService);
    categoriesService = moduleRef.get(CategoriesService);
    transactionsService = moduleRef.get(TransactionsService);
    userModel = moduleRef.get(getModelToken(User.name));
    accountModel = moduleRef.get(getModelToken(Account.name));
    categoryModel = moduleRef.get(getModelToken(Category.name));
    transactionModel = moduleRef.get(getModelToken(Transaction.name));
  }, 60_000);

  afterAll(async () => {
    await moduleRef.close();
    await mongod.stop();
  });

  it('erases all financial data and the profile, then deletes the Clerk identity', async () => {
    const user = await userModel.create({
      clerkUserId: 'user_test123',
      email: 'a@b.com',
      name: 'Test User',
    });

    const account = await accountsService.create(user._id, {
      name: 'Cash',
      type: 'cash',
      initialBalance: 0,
      currency: 'INR',
    });
    const category = await categoriesService.create(user._id, {
      name: 'Food',
      type: 'expense',
    });
    await transactionsService.create(user._id, {
      type: 'expense',
      amount: 100,
      accountId: account._id.toString(),
      categoryId: category._id.toString(),
      date: new Date(),
    });

    await usersService.deleteAccount(user);

    expect(await userModel.findById(user._id)).toBeNull();
    expect(await accountModel.countDocuments({ userId: user._id })).toBe(0);
    expect(await categoryModel.countDocuments({ userId: user._id })).toBe(0);
    expect(await transactionModel.countDocuments({ userId: user._id })).toBe(0);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock reference, not a real bound method
    const deleteUserMock = clerkClient.users.deleteUser;
    expect(deleteUserMock).toHaveBeenCalledWith('user_test123');
  });

  it('updateProfile updates currency/timezone and persists them', async () => {
    const user = await userModel.create({
      clerkUserId: 'user_update_profile',
      email: 'profile@b.com',
      name: 'Profile User',
      currency: 'USD',
      timezone: 'UTC',
    });

    const updated = await usersService.updateProfile(user, {
      currency: 'INR',
      timezone: 'Asia/Kolkata',
    });

    expect(updated.currency).toBe('INR');
    expect(updated.timezone).toBe('Asia/Kolkata');

    const persisted = await userModel.findById(user._id);
    expect(persisted?.currency).toBe('INR');
    expect(persisted?.timezone).toBe('Asia/Kolkata');
  });

  it('updateFromClerkWebhook syncs email/name/imageUrl and no-ops for an unknown clerk id', async () => {
    const user = await userModel.create({
      clerkUserId: 'user_webhook_update',
      email: 'old@b.com',
      name: 'Old Name',
    });

    await usersService.updateFromClerkWebhook('user_webhook_update', {
      email: 'new@b.com',
      name: 'New Name',
      imageUrl: 'https://example.com/avatar.png',
    });

    const updated = await userModel.findById(user._id);
    expect(updated?.email).toBe('new@b.com');
    expect(updated?.name).toBe('New Name');
    expect(updated?.imageUrl).toBe('https://example.com/avatar.png');

    // No matching Pocketly user for this clerk id -- must not throw.
    await expect(
      usersService.updateFromClerkWebhook('user_does_not_exist', {
        email: 'x@y.com',
      }),
    ).resolves.toBeUndefined();
  });

  it('deleteByClerkId erases financial data without calling Clerk, and no-ops for an unknown clerk id', async () => {
    const user = await userModel.create({
      clerkUserId: 'user_webhook_delete',
      email: 'delete@b.com',
      name: 'Delete User',
    });
    await accountsService.create(user._id, {
      name: 'Cash',
      type: 'cash',
      initialBalance: 0,
      currency: 'INR',
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock reference, not a real bound method
    const deleteUserMock = clerkClient.users.deleteUser as jest.Mock;
    deleteUserMock.mockClear();

    await usersService.deleteByClerkId('user_webhook_delete');

    expect(await userModel.findById(user._id)).toBeNull();
    expect(await accountModel.countDocuments({ userId: user._id })).toBe(0);
    expect(deleteUserMock).not.toHaveBeenCalled();

    // No matching Pocketly user for this clerk id -- must not throw.
    await expect(
      usersService.deleteByClerkId('user_does_not_exist'),
    ).resolves.toBeUndefined();
  });
});
