import { INestApplication, RequestMethod } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';

/**
 * Boots the full app against an in-memory MongoDB.
 * Auth is natively part of AppModule so standard controllers handle /api/auth.
 */
export async function createTestApp(): Promise<{
  app: INestApplication<App>;
  mongod: MongoMemoryServer;
}> {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app: INestApplication<App> = moduleFixture.createNestApplication();

  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'mcp', method: RequestMethod.ALL },
      { path: 'api/auth/(.*)', method: RequestMethod.ALL },
      { path: '.well-known/(.*)', method: RequestMethod.ALL },
    ],
  });

  await app.init();
  return { app, mongod };
}
