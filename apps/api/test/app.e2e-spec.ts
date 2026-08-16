import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types';
import { requestIdMiddleware } from '../src/common/logging/request-id.middleware';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let mongod: MongoMemoryServer;
  let app: INestApplication<App>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
  }, 60_000);

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(requestIdMiddleware);
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await mongod.stop();
  });

  it('/api/v1/health (GET) wraps the response in { data } and sets a request id', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(response.body).toEqual({ data: { status: 'ok', database: 'up' } });
    expect(response.headers['x-request-id']).toEqual(expect.any(String));
  });

  it('/api/v1/health (GET) returns 503 when the database is unreachable', async () => {
    const connection = app.get<Connection>(getConnectionToken());
    await connection.close();

    await request(app.getHttpServer()).get('/api/v1/health').expect(503);
  });
});
