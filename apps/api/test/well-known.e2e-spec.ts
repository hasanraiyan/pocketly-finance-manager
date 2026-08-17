import { INestApplication, RequestMethod } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

interface ResourceMetadata {
  resource: string;
  authorization_servers: string[];
  scopes_supported: string[];
  bearer_methods_supported: string[];
}

/**
 * OAuth discovery is read by generic clients, not by our own frontend, so
 * the exact wire shape is the contract. These assertions exist because a
 * previous deploy served the metadata wrapped in the API's `{ data: ... }`
 * envelope: a 200 with a valid-looking body that no compliant client can
 * parse, which is invisible to every test that only checks the status code.
 */
describe('OAuth discovery (e2e)', () => {
  let mongod: MongoMemoryServer;
  let app: INestApplication<App>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
    // A well-formed dev publishable key: base64 of "<frontend-api>$".
    process.env.CLERK_PUBLISHABLE_KEY = `pk_test_${Buffer.from(
      'example-42.clerk.accounts.dev$',
    ).toString('base64')}`;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', {
      exclude: [
        { path: 'mcp', method: RequestMethod.ALL },
        { path: '.well-known/(.*)', method: RequestMethod.ALL },
      ],
    });
    await app.init();
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  it('serves protected-resource metadata unwrapped, at the top level', async () => {
    const res = await request(app.getHttpServer())
      .get('/.well-known/oauth-protected-resource')
      .expect(200);

    const body = res.body as ResourceMetadata;
    expect(res.body).not.toHaveProperty('data');
    expect(body.resource).toMatch(/\/mcp$/);
    expect(body.bearer_methods_supported).toEqual(['header']);
  });

  it('points clients at the Clerk instance encoded in the publishable key', async () => {
    const res = await request(app.getHttpServer())
      .get('/.well-known/oauth-protected-resource/mcp')
      .expect(200);

    expect((res.body as ResourceMetadata).authorization_servers).toEqual([
      'https://example-42.clerk.accounts.dev',
    ]);
  });

  it('advertises only scopes Clerk can actually issue', async () => {
    const res = await request(app.getHttpServer())
      .get('/.well-known/oauth-protected-resource')
      .expect(200);

    // Custom scopes aren't supported by Clerk yet; advertising pocketly:*
    // would send clients off to request scopes that get refused.
    expect((res.body as ResourceMetadata).scopes_supported).not.toContain(
      'pocketly:read',
    );
  });

  it('redirects authorization-server probes to Clerk', async () => {
    const res = await request(app.getHttpServer())
      .get('/.well-known/oauth-authorization-server')
      .expect(302);

    expect(res.headers.location).toBe(
      'https://example-42.clerk.accounts.dev/.well-known/oauth-authorization-server',
    );
  });

  it('503s instead of stranding clients when Clerk is not configured', async () => {
    const key = process.env.CLERK_PUBLISHABLE_KEY;
    delete process.env.CLERK_PUBLISHABLE_KEY;

    try {
      await request(app.getHttpServer())
        .get('/.well-known/oauth-protected-resource')
        .expect(503);
    } finally {
      process.env.CLERK_PUBLISHABLE_KEY = key;
    }
  });
});
