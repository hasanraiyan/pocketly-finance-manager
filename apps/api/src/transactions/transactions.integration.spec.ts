import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Types } from 'mongoose';
import { AccountsService } from '../accounts/accounts.service';
import { Account, AccountSchema } from '../accounts/schemas/account.schema';
import { BudgetsService } from '../budgets/budgets.service';
import { Budget, BudgetSchema } from '../budgets/schemas/budget.schema';
import { CategoriesService } from '../categories/categories.service';
import {
  Category,
  CategorySchema,
} from '../categories/schemas/category.schema';
import { TransactionsService } from './transactions.service';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';

describe('Finance domain integration (transactions -> balances/budgets, ownership)', () => {
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;
  let accountsService: AccountsService;
  let categoriesService: CategoriesService;
  let transactionsService: TransactionsService;
  let budgetsService: BudgetsService;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();

    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongod.getUri()),
        MongooseModule.forFeature([
          { name: Account.name, schema: AccountSchema },
          { name: Category.name, schema: CategorySchema },
          { name: Transaction.name, schema: TransactionSchema },
          { name: Budget.name, schema: BudgetSchema },
        ]),
      ],
      providers: [
        AccountsService,
        CategoriesService,
        TransactionsService,
        BudgetsService,
      ],
    }).compile();

    accountsService = moduleRef.get(AccountsService);
    categoriesService = moduleRef.get(CategoriesService);
    transactionsService = moduleRef.get(TransactionsService);
    budgetsService = moduleRef.get(BudgetsService);
  }, 60_000);

  afterAll(async () => {
    await moduleRef.close();
    await mongod.stop();
  });

  it('updates the account balance when a transaction is created, and enforces ownership', async () => {
    const userId = new Types.ObjectId();
    const otherUserId = new Types.ObjectId();

    const account = await accountsService.create(userId, {
      name: 'HDFC Bank',
      type: 'bank',
      initialBalance: 10_000,
      currency: 'INR',
    });
    const category = await categoriesService.create(userId, {
      name: 'Food',
      type: 'expense',
    });

    await transactionsService.create(userId, {
      type: 'expense',
      amount: 2_000,
      accountId: account._id.toString(),
      categoryId: category._id.toString(),
      date: new Date(),
    });

    const found = await accountsService.findOne(userId, account._id.toString());
    expect(found.balance).toBe(8_000);

    // A second user must never be able to read or act on the first user's data.
    await expect(
      accountsService.findOne(otherUserId, account._id.toString()),
    ).rejects.toThrow();
    await expect(
      transactionsService.create(otherUserId, {
        type: 'expense',
        amount: 100,
        accountId: account._id.toString(),
        categoryId: category._id.toString(),
        date: new Date(),
      }),
    ).rejects.toThrow();
  });

  it('reflects a new expense in the budget spent/remaining/percentage', async () => {
    const userId = new Types.ObjectId();

    const account = await accountsService.create(userId, {
      name: 'Cash',
      type: 'cash',
      initialBalance: 0,
      currency: 'INR',
    });
    const category = await categoriesService.create(userId, {
      name: 'Food',
      type: 'expense',
    });
    const user = { _id: userId, timezone: 'Asia/Kolkata' } as never;

    const budget = await budgetsService.create(user, {
      categoryId: category._id.toString(),
      amount: 5_000,
      period: 'monthly',
    });
    expect(budget.spent).toBe(0);
    expect(budget.remaining).toBe(5_000);

    await transactionsService.create(userId, {
      type: 'expense',
      amount: 3_200,
      accountId: account._id.toString(),
      categoryId: category._id.toString(),
      date: new Date(),
    });

    const status = await budgetsService.findOne(user, budget._id.toString());
    expect(status.spent).toBe(3_200);
    expect(status.remaining).toBe(1_800);
    expect(status.percentageUsed).toBe(64);
  });
});
