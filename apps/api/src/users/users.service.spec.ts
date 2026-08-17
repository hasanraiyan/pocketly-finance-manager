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
  }, 60_000);

  afterAll(async () => {
    await moduleRef.close();
    await mongod.stop();
  });

  it('deleteAccount erases all financial data and the profile', async () => {
    const user = await userModel.create({
      email: 'a@b.com',
      authUserId: 'test-auth-user-id-1',
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
  });

  it('updateProfile updates currency/timezone and persists them', async () => {
    const user = await userModel.create({
      email: 'profile@b.com',
      authUserId: 'test-auth-user-id-2',
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
});
