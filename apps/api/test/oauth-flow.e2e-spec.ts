import { INestApplication } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { App } from 'supertest/types';
import * as crypto from 'crypto';
import { createTestApp } from './support/create-test-app';
import { signUpTestUser } from './support/auth';

function pkcePair() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
  return { verifier, challenge };
}

/**
 * The full MCP connection handshake against Pocketly's own OAuth 2.1
 * authorization server: DCR -> authorize (cookie-authenticated browser
 * redirect) -> consent (Bearer-authenticated, from the web app's own
 * /mcp-connect page) -> token (PKCE-verified) -> an authenticated tool call
 * with the token that flow produced. This is what a real MCP client (Claude,
 * ChatGPT) does end to end; the MCP Inspector exercises the same thing
 * manually against a running dev server.
 */
describe('MCP OAuth flow (e2e)', () => {
  let mongod: MongoMemoryServer;
  let app: INestApplication<App>;
  let accessToken: string;

  beforeAll(async () => {
    ({ app, mongod } = await createTestApp());
    ({ token: accessToken } = await signUpTestUser(app.getHttpServer()));
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  async function registerClient() {
    const res = await request(app.getHttpServer())
      .post('/api/v1/oauth2/register')
      .send({
        client_name: 'Test MCP Client',
        redirect_uris: ['https://client.example/callback'],
      })
      .expect(201);
    return (res.body as { client_id: string }).client_id;
  }

  it('completes the full handshake and the resulting token works against /mcp', async () => {
    const clientId = await registerClient();
    const { verifier, challenge } = pkcePair();

    const authorizeRes = await request(app.getHttpServer())
      .get('/api/v1/oauth2/authorize')
      .query({
        client_id: clientId,
        redirect_uri: 'https://client.example/callback',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state: 'xyz',
      })
      .set('Cookie', `pocketly_access_token=${accessToken}`)
      .expect(302);

    const consentUrl = new URL(authorizeRes.headers.location);
    expect(consentUrl.pathname).toBe('/mcp-connect');
    expect(consentUrl.searchParams.get('client_id')).toBe(clientId);

    const consentRes = await request(app.getHttpServer())
      .post('/api/v1/oauth2/consent')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        accept: true,
        client_id: consentUrl.searchParams.get('client_id'),
        redirect_uri: consentUrl.searchParams.get('redirect_uri'),
        code_challenge: consentUrl.searchParams.get('code_challenge'),
        code_challenge_method: consentUrl.searchParams.get(
          'code_challenge_method',
        ),
        state: consentUrl.searchParams.get('state'),
      })
      .expect(200);

    const redirectUrl = new URL(
      (consentRes.body as { data: { url: string } }).data.url,
    );
    expect(redirectUrl.searchParams.get('state')).toBe('xyz');
    const code = redirectUrl.searchParams.get('code');
    expect(code).toBeTruthy();

    const tokenRes = await request(app.getHttpServer())
      .post('/api/v1/oauth2/token')
      .send({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        code_verifier: verifier,
      })
      .expect(200);

    expect(tokenRes.body).toMatchObject({
      token_type: 'Bearer',
      expires_in: 3600,
    });
    const mcpToken = (tokenRes.body as { access_token: string }).access_token;

    // The same code must not be redeemable twice.
    await request(app.getHttpServer())
      .post('/api/v1/oauth2/token')
      .send({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        code_verifier: verifier,
      })
      .expect(400);

    // The Streamable HTTP transport itself (not our guard) requires this
    // Accept header on every request, per the MCP spec.
    const mcpAccept = 'application/json, text/event-stream';

    await request(app.getHttpServer())
      .post('/mcp')
      .set('Authorization', `Bearer ${mcpToken}`)
      .set('Accept', mcpAccept)
      .send({
        jsonrpc: '2.0',
        method: 'initialize',
        id: 1,
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      })
      .expect(200);

    // A session token isn't valid here, and vice versa -- the audience claim
    // keeps the two token kinds from being swapped for one another.
    await request(app.getHttpServer())
      .post('/mcp')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', mcpAccept)
      .send({ jsonrpc: '2.0', method: 'initialize', id: 1 })
      .expect(401);
  });

  it('rejects a token exchange with the wrong PKCE verifier', async () => {
    const clientId = await registerClient();
    const { challenge } = pkcePair();

    const authorizeRes = await request(app.getHttpServer())
      .get('/api/v1/oauth2/authorize')
      .query({
        client_id: clientId,
        redirect_uri: 'https://client.example/callback',
        code_challenge: challenge,
        code_challenge_method: 'S256',
      })
      .set('Cookie', `pocketly_access_token=${accessToken}`)
      .expect(302);
    const consentUrl = new URL(authorizeRes.headers.location);

    const consentRes = await request(app.getHttpServer())
      .post('/api/v1/oauth2/consent')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        accept: true,
        client_id: clientId,
        redirect_uri: 'https://client.example/callback',
        code_challenge: consentUrl.searchParams.get('code_challenge'),
        code_challenge_method: 'S256',
      })
      .expect(200);
    const code = new URL(
      (consentRes.body as { data: { url: string } }).data.url,
    ).searchParams.get('code');

    await request(app.getHttpServer())
      .post('/api/v1/oauth2/token')
      .send({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        code_verifier: 'the-wrong-verifier-entirely',
      })
      .expect(401);
  });

  it('sends an unauthenticated browser to sign in, with a same-origin path back to /mcp-connect', async () => {
    const clientId = await registerClient();
    const { challenge } = pkcePair();

    const res = await request(app.getHttpServer())
      .get('/api/v1/oauth2/authorize')
      .query({
        client_id: clientId,
        redirect_uri: 'https://client.example/callback',
        code_challenge: challenge,
        code_challenge_method: 'S256',
      })
      .expect(302);

    expect(res.headers.location).toContain('/sign-in?redirect=');
    // Regression guard: this used to point back at /oauth2/authorize itself
    // (a different origin from the web app's sign-in page), which the web
    // app's same-origin client-side redirect couldn't reach -> 404. It must
    // point at /mcp-connect, which lives on the web app's own origin.
    const redirectParam = new URL(
      res.headers.location,
      'http://localhost',
    ).searchParams.get('redirect');
    expect(redirectParam).toMatch(/^\/mcp-connect\?/);
    expect(redirectParam).not.toContain('/oauth2/authorize');
  });
});
