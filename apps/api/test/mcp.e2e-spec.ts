import { INestApplication, RequestMethod } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

/**
 * Covers what's specific to this app's own wiring: auth enforcement on
 * /mcp, and that it's excluded from the global prefix, matching main.ts.
 * The full authorize -> consent -> token exchange (`mcp/oauth/`) is
 * exercised end to end in `oauth-flow.e2e-spec.ts` and via the MCP
 * Inspector against a running dev server, not re-simulated here.
 */
describe('MCP (e2e)', () => {
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
    app.setGlobalPrefix('api/v1', {
      exclude: [{ path: 'mcp', method: RequestMethod.ALL }],
    });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await mongod.stop();
  });

  it('rejects a tool call with no bearer token', async () => {
    await request(app.getHttpServer())
      .post('/mcp')
      .send({ jsonrpc: '2.0', method: 'initialize', id: 1 })
      .expect(401);
  });

  it('rejects a tool call with an invalid bearer token', async () => {
    await request(app.getHttpServer())
      .post('/mcp')
      .set('Authorization', 'Bearer not-a-real-token')
      .send({ jsonrpc: '2.0', method: 'initialize', id: 1 })
      .expect(401);
  });

  it('requires auth on every method, including GET/DELETE', async () => {
    // McpAuthGuard is applied at the controller level, so it runs before
    // the 405 (stateless transport has no GET stream / DELETE session)
    // logic in the handlers themselves is ever reached.
    await request(app.getHttpServer()).get('/mcp').expect(401);
    await request(app.getHttpServer()).delete('/mcp').expect(401);
  });
});
