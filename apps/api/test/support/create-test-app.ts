import { INestApplication, RequestMethod } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { toNodeHandler } from 'better-auth/node';
import express from 'express';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { getAuth } from '../../src/auth/auth.config';

/**
 * Boots the full app against an in-memory MongoDB, same as app.e2e-spec.ts,
 * but also mounts Better Auth's own handler at /api/auth -- main.ts does
 * this manually outside AppModule, so createNestApplication() alone (the
 * pattern the other specs use) doesn't give you a working sign-up/sign-in
 * flow. Needed by any spec that authenticates as a real user rather than
 * just exercising a guard's rejection path.
 *
 * MONGODB_URI is set *before* getAuth() is called, so Better Auth's own
 * MongoDB connection (built lazily, see auth.config.ts) picks up the
 * in-memory server too -- not whatever real MONGODB_URI is in .env.
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

  const app: INestApplication<App> = moduleFixture.createNestApplication({
    bodyParser: false,
  });

  // Order matters -- see main.ts's identical comment: Better Auth reads the
  // raw request body itself, so Nest's own parsers are added after it.
  app.use('/api/auth', toNodeHandler(getAuth()));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'mcp', method: RequestMethod.ALL }],
  });

  await app.init();
  return { app, mongod };
}
