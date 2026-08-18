import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model } from 'mongoose';
import { AccountsService } from '../accounts/accounts.service';
import {
  Account,
  AccountDocument,
  AccountSchema,
} from '../accounts/schemas/account.schema';
import {
  RefreshToken,
  RefreshTokenDocument,
  RefreshTokenSchema,
} from '../auth/schemas/refresh-token.schema';
import { Budget, BudgetSchema } from '../budgets/schemas/budget.schema';
import { Goal, GoalDocument, GoalSchema } from '../goals/schemas/goal.schema';
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
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service';
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
  let goalModel: Model<GoalDocument>;
  let refreshTokenModel: Model<RefreshTokenDocument>;

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
          { name: Goal.name, schema: GoalSchema },
          { name: RefreshToken.name, schema: RefreshTokenSchema },
        ]),
      ],
      providers: [
        UsersService,
        AccountsService,
        CategoriesService,
        TransactionsService,
        {
          provide: NotificationDispatcherService,
          useValue: {
            dispatch: jest.fn(),
            checkBudgetThresholdAfterTransaction: jest
              .fn()
              .mockResolvedValue(undefined),
          },
        },
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
    goalModel = moduleRef.get(getModelToken(Goal.name));
    refreshTokenModel = moduleRef.get(getModelToken(RefreshToken.name));
  }, 60_000);

  afterAll(async () => {
    await moduleRef.close();
    await mongod.stop();
  });

  it('deleteAccount erases all financial data and the profile', async () => {
    const user = await userModel.create({
      email: 'a@b.com',
      passwordHash: 'hash',
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

    await goalModel.create({
      userId: user._id,
      name: 'Emergency fund',
      targetAmount: 1_000_000,
    });
    await refreshTokenModel.create({
      userId: user._id,
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 1_000_000),
    });

    await usersService.deleteAccount(user);

    expect(await userModel.findById(user._id)).toBeNull();
    expect(await accountModel.countDocuments({ userId: user._id })).toBe(0);
    expect(await categoryModel.countDocuments({ userId: user._id })).toBe(0);
    expect(await transactionModel.countDocuments({ userId: user._id })).toBe(0);
    expect(await goalModel.countDocuments({ userId: user._id })).toBe(0);
    expect(await refreshTokenModel.countDocuments({ userId: user._id })).toBe(
      0,
    );
  });

  it('updateProfile updates currency/timezone and persists them', async () => {
    const user = await userModel.create({
      email: 'profile@b.com',
      passwordHash: 'hash',
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

  it('findAllUsers pages through results via cursor with no overlap or gaps', async () => {
    const created: UserDocument[] = [];
    for (let i = 0; i < 5; i++) {
      // Sequential, not parallel -- ids must be created in order for the
      // newest-first cursor assertions below to be meaningful.
      created.push(
        await userModel.create({
          email: `cursor-${i}@b.com`,
          passwordHash: 'hash',
          name: `Cursor User ${i}`,
        }),
      );
    }
    const createdIds = created.map((u) => u._id.toString());

    const firstPage = await usersService.findAllUsers({
      limit: 2,
      search: 'cursor-',
    });
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.nextCursor).not.toBeNull();
    // Newest first (sorted by _id descending), matching creation order reversed.
    expect(firstPage.items.map((u) => u._id.toString())).toEqual(
      [...createdIds].reverse().slice(0, 2),
    );

    const secondPage = await usersService.findAllUsers({
      limit: 2,
      search: 'cursor-',
      cursor: firstPage.nextCursor!,
    });
    expect(secondPage.items).toHaveLength(2);
    expect(secondPage.nextCursor).not.toBeNull();
    expect(secondPage.items.map((u) => u._id.toString())).toEqual(
      [...createdIds].reverse().slice(2, 4),
    );
    // No overlap between pages -- the bug this guards against previously
    // returned the exact same first page every time, since `cursor` was
    // never applied to the query.
    const firstIds = new Set(firstPage.items.map((u) => u._id.toString()));
    for (const item of secondPage.items) {
      expect(firstIds.has(item._id.toString())).toBe(false);
    }

    const thirdPage = await usersService.findAllUsers({
      limit: 2,
      search: 'cursor-',
      cursor: secondPage.nextCursor!,
    });
    expect(thirdPage.items).toHaveLength(1);
    expect(thirdPage.nextCursor).toBeNull();
    expect(thirdPage.items[0]._id.toString()).toBe(createdIds[0]);
  });
});
