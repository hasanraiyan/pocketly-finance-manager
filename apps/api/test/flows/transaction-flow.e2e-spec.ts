import { INestApplication } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp } from '../support/create-test-app';
import { signUpTestUser } from '../support/auth';
import { envelope } from '../support/http';

interface AccountWithBalance {
  _id: string;
  balance: number;
}

interface Category {
  _id: string;
}

interface Transaction {
  _id: string;
}

describe('Transaction flow (e2e)', () => {
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

  it('carries a create -> update -> delete transaction lifecycle through to the account balance', async () => {
    const accountRes = await request(app.getHttpServer())
      .post('/api/v1/accounts')
      .set(authHeader)
      .send({
        name: 'Wallet',
        type: 'cash',
        initialBalance: 100_000,
        currency: 'INR',
      })
      .expect(201);
    const account = envelope<AccountWithBalance>(accountRes).data;
    expect(account.balance).toBe(100_000);

    const categoryRes = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set(authHeader)
      .send({ name: 'Food', type: 'expense' })
      .expect(201);
    const category = envelope<Category>(categoryRes).data;

    const txRes = await request(app.getHttpServer())
      .post('/api/v1/transactions')
      .set(authHeader)
      .send({
        type: 'expense',
        amount: 25_000,
        accountId: account._id,
        categoryId: category._id,
        date: new Date().toISOString(),
      })
      .expect(201);
    const tx = envelope<Transaction>(txRes).data;

    const afterExpense = await request(app.getHttpServer())
      .get(`/api/v1/accounts/${account._id}`)
      .set(authHeader)
      .expect(200);
    expect(envelope<AccountWithBalance>(afterExpense).data.balance).toBe(
      75_000,
    );

    await request(app.getHttpServer())
      .patch(`/api/v1/transactions/${tx._id}`)
      .set(authHeader)
      .send({ amount: 40_000 })
      .expect(200);

    const afterUpdate = await request(app.getHttpServer())
      .get(`/api/v1/accounts/${account._id}`)
      .set(authHeader)
      .expect(200);
    expect(envelope<AccountWithBalance>(afterUpdate).data.balance).toBe(60_000);

    await request(app.getHttpServer())
      .delete(`/api/v1/transactions/${tx._id}`)
      .set(authHeader)
      .expect(200);

    const afterDelete = await request(app.getHttpServer())
      .get(`/api/v1/accounts/${account._id}`)
      .set(authHeader)
      .expect(200);
    expect(envelope<AccountWithBalance>(afterDelete).data.balance).toBe(
      100_000,
    );
  });
});
