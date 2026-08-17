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

interface AuthorizationServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint: string;
  jwks_uri: string;
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
    process.env.API_BASE_URL = 'http://localhost:4000';

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

  it('points clients at itself as the authorization server', async () => {
    const res = await request(app.getHttpServer())
      .get('/.well-known/oauth-protected-resource/mcp')
      .expect(200);

    expect((res.body as ResourceMetadata).authorization_servers).toEqual([
      'http://localhost:4000',
    ]);
  });

  it('advertises both Pocketly scopes -- there is no external issuer to be limited by any more', async () => {
    const res = await request(app.getHttpServer())
      .get('/.well-known/oauth-protected-resource')
      .expect(200);

    expect((res.body as ResourceMetadata).scopes_supported).toEqual([
      'pocketly:read',
      'pocketly:write',
    ]);
  });

  it('serves its own authorization-server metadata, unwrapped', async () => {
    const res = await request(app.getHttpServer())
      .get('/.well-known/oauth-authorization-server')
      .expect(200);

    const body = res.body as AuthorizationServerMetadata;
    expect(res.body).not.toHaveProperty('data');
    expect(body.issuer).toBe('http://localhost:4000');
    expect(body.authorization_endpoint).toBe(
      'http://localhost:4000/oauth2/authorize',
    );
    expect(body.token_endpoint).toBe('http://localhost:4000/oauth2/token');
    expect(body.registration_endpoint).toBe(
      'http://localhost:4000/oauth2/register',
    );
    expect(body.jwks_uri).toBe('http://localhost:4000/oauth2/jwks');
  });
});
