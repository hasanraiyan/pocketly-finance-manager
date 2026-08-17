import { INestApplication, RequestMethod } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { ClerkAuthGuard } from '../../src/common/auth/clerk-auth.guard';
import { TestAuthGuard } from './test-auth.guard';

/**
 * Boots the full app against an in-memory MongoDB, with ClerkAuthGuard
 * swapped for TestAuthGuard so no live Clerk instance is needed. Everything
 * else -- module graph, guards, interceptors, pipes -- is the real thing.
 */
export async function createTestApp(): Promise<{
  app: INestApplication<App>;
  mongod: MongoMemoryServer;
}> {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(ClerkAuthGuard)
    .useClass(TestAuthGuard)
    .compile();

  const app: INestApplication<App> = moduleFixture.createNestApplication();

  // Mirrors main.ts.
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'mcp', method: RequestMethod.ALL },
      { path: '.well-known/(.*)', method: RequestMethod.ALL },
      { path: 'webhooks/(.*)', method: RequestMethod.ALL },
    ],
  });

  await app.init();
  return { app, mongod };
}
