import { INestApplication } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp } from '../support/create-test-app';
import { signUpTestUser } from '../support/auth';
import { envelope } from '../support/http';

interface Account {
  _id: string;
}

interface Category {
  _id: string;
}

interface Transaction {
  _id: string;
}

interface BudgetWithStatus {
  _id: string;
  spent: number;
  percentageUsed: number;
}

describe('Budget flow (e2e)', () => {
  let app: INestApplication<App>;
  let mongod: MongoMemoryServer;
  let authHeader: { Authorization: string };

  beforeAll(async () => {
    ({ app, mongod } = await createTestApp());
    const { token } = await signUpTestUser(app.getHttpServer());
    authHeader = { Authorization: `Bearer ${token}` };
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  it('carries an expense through to the budget status, and resets it on delete', async () => {
    const accountRes = await request(app.getHttpServer())
      .post('/api/v1/accounts')
      .set(authHeader)
      .send({
        name: 'Wallet',
        type: 'cash',
        initialBalance: 500_000,
        currency: 'INR',
      })
      .expect(201);
    const account = envelope<Account>(accountRes).data;

    const categoryRes = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set(authHeader)
      .send({ name: 'Groceries', type: 'expense' })
      .expect(201);
    const category = envelope<Category>(categoryRes).data;

    const budgetRes = await request(app.getHttpServer())
      .post('/api/v1/budgets')
      .set(authHeader)
      .send({ categoryId: category._id, amount: 100_000, period: 'monthly' })
      .expect(201);
    const budget = envelope<BudgetWithStatus>(budgetRes).data;
    expect(budget.spent).toBe(0);
    expect(budget.percentageUsed).toBe(0);

    const txRes = await request(app.getHttpServer())
      .post('/api/v1/transactions')
      .set(authHeader)
      .send({
        type: 'expense',
        amount: 30_000,
        accountId: account._id,
        categoryId: category._id,
        date: new Date().toISOString(),
      })
      .expect(201);
    const tx = envelope<Transaction>(txRes).data;

    const afterExpense = await request(app.getHttpServer())
      .get(`/api/v1/budgets/${budget._id}`)
      .set(authHeader)
      .expect(200);
    expect(envelope<BudgetWithStatus>(afterExpense).data.spent).toBe(30_000);
    expect(envelope<BudgetWithStatus>(afterExpense).data.percentageUsed).toBe(
      30,
    );

    await request(app.getHttpServer())
      .patch(`/api/v1/transactions/${tx._id}`)
      .set(authHeader)
      .send({ amount: 50_000 })
      .expect(200);

    const afterUpdate = await request(app.getHttpServer())
      .get(`/api/v1/budgets/${budget._id}`)
      .set(authHeader)
      .expect(200);
    expect(envelope<BudgetWithStatus>(afterUpdate).data.spent).toBe(50_000);
    expect(envelope<BudgetWithStatus>(afterUpdate).data.percentageUsed).toBe(
      50,
    );

    await request(app.getHttpServer())
      .delete(`/api/v1/transactions/${tx._id}`)
      .set(authHeader)
      .expect(200);

    const afterDelete = await request(app.getHttpServer())
      .get(`/api/v1/budgets/${budget._id}`)
      .set(authHeader)
      .expect(200);
    expect(envelope<BudgetWithStatus>(afterDelete).data.spent).toBe(0);
    expect(envelope<BudgetWithStatus>(afterDelete).data.percentageUsed).toBe(0);
  });
});
