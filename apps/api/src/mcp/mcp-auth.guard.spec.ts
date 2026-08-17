import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Model } from 'mongoose';
import { McpAuthGuard } from './mcp-auth.guard';
import { McpConnection } from './schemas/mcp-connection.schema';
import { McpRevocation } from './schemas/mcp-revocation.schema';
import { UsersService } from '../users/users.service';

const getAuth = jest.fn();
jest.mock('@clerk/express', () => ({
  getAuth: (...args: unknown[]): unknown => getAuth(...args),
}));

/** A JWT-format access token, so the guard can read `iat` off it. */
function jwtWithIat(iat: number): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iat })}.signature`;
}

function mockResponse() {
  return { setHeader: jest.fn() };
}

function contextWithAuthHeader(header?: string): ExecutionContext {
  const request = { headers: { authorization: header } };
  const response = mockResponse();
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
}

describe('McpAuthGuard', () => {
  let usersService: { findByClerkId: jest.Mock };
  let revocationModel: { exists: jest.Mock };
  let connectionModel: { updateOne: jest.Mock };
  let guard: McpAuthGuard;

  beforeEach(() => {
    getAuth.mockReset();
    usersService = { findByClerkId: jest.fn() };
    revocationModel = { exists: jest.fn().mockResolvedValue(null) };
    connectionModel = { updateOne: jest.fn().mockResolvedValue(undefined) };
    guard = new McpAuthGuard(
      usersService as unknown as UsersService,
      revocationModel as unknown as Model<McpRevocation>,
      connectionModel as unknown as Model<McpConnection>,
    );
  });

  it('rejects requests with no bearer token', async () => {
    await expect(
      guard.canActivate(contextWithAuthHeader(undefined)),
    ).rejects.toThrow(UnauthorizedException);
    expect(getAuth).not.toHaveBeenCalled();
  });

  it('rejects requests when Clerk does not authenticate the token', async () => {
    getAuth.mockReturnValue({ isAuthenticated: false });

    await expect(
      guard.canActivate(contextWithAuthHeader('Bearer bad-token')),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('asks Clerk for an OAuth token specifically, not a session token', async () => {
    getAuth.mockReturnValue({ isAuthenticated: false });

    await expect(
      guard.canActivate(contextWithAuthHeader('Bearer any-token')),
    ).rejects.toThrow(UnauthorizedException);
    expect(getAuth).toHaveBeenCalledWith(expect.anything(), {
      acceptsToken: 'oauth_token',
    });
  });

  it('rejects a token issued before the connection was revoked', async () => {
    const token = jwtWithIat(1_000);
    getAuth.mockReturnValue({
      isAuthenticated: true,
      userId: 'user_1',
      clientId: 'client-1',
      scopes: ['pocketly:read'],
    });
    revocationModel.exists.mockResolvedValue({ _id: 'revocation-1' });

    await expect(
      guard.canActivate(contextWithAuthHeader(`Bearer ${token}`)),
    ).rejects.toThrow(UnauthorizedException);
    expect(revocationModel.exists).toHaveBeenCalledWith({
      authUserId: 'user_1',
      clientId: 'client-1',
      createdAt: { $gt: new Date(1_000 * 1000) },
    });
    expect(usersService.findByClerkId).not.toHaveBeenCalled();
  });

  it('allows a token issued after the last revocation for that client', async () => {
    getAuth.mockReturnValue({
      isAuthenticated: true,
      userId: 'user_1',
      clientId: 'client-1',
      scopes: ['pocketly:read'],
    });
    revocationModel.exists.mockResolvedValue(null);
    usersService.findByClerkId.mockResolvedValue({
      _id: 'user-doc-1',
      authUserId: 'user_1',
    });

    await expect(
      guard.canActivate(contextWithAuthHeader(`Bearer ${jwtWithIat(2_000)}`)),
    ).resolves.toBe(true);
  });

  it('skips the revocation check for opaque tokens, which Clerk revokes itself', async () => {
    getAuth.mockReturnValue({
      isAuthenticated: true,
      userId: 'user_1',
      clientId: 'client-1',
      scopes: [],
    });
    usersService.findByClerkId.mockResolvedValue({
      _id: 'user-doc-1',
      authUserId: 'user_1',
    });

    await expect(
      guard.canActivate(contextWithAuthHeader('Bearer oat_opaque_token')),
    ).resolves.toBe(true);
    expect(revocationModel.exists).not.toHaveBeenCalled();
  });

  it('rejects a valid token for a user with no Pocketly profile yet', async () => {
    getAuth.mockReturnValue({
      isAuthenticated: true,
      userId: 'user_1',
      scopes: [],
    });
    usersService.findByClerkId.mockResolvedValue(null);

    await expect(
      guard.canActivate(contextWithAuthHeader('Bearer good-token')),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('attaches the resolved user, token and scopes on success', async () => {
    // Clerk's own grant (openid/profile/email) says nothing about Pocketly
    // data -- custom scopes aren't supported yet -- so an authorized
    // connection gets full access. See GRANTED_SCOPES in the guard.
    getAuth.mockReturnValue({
      isAuthenticated: true,
      userId: 'user_1',
      scopes: ['openid', 'profile', 'email'],
    });
    const user = { _id: 'user-doc-1', authUserId: 'user_1' };
    usersService.findByClerkId.mockResolvedValue(user);

    const request = { headers: { authorization: 'Bearer good-token' } };
    const response = mockResponse();
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    const authenticated = request as unknown as {
      mcpUser: unknown;
      mcpToken: unknown;
      mcpScopes: string[];
    };
    expect(authenticated.mcpUser).toBe(user);
    expect(authenticated.mcpToken).toBe('good-token');
    expect(authenticated.mcpScopes).toEqual([
      'pocketly:read',
      'pocketly:write',
    ]);
  });

  it('records the connection so Settings can list and disconnect it', async () => {
    getAuth.mockReturnValue({
      isAuthenticated: true,
      userId: 'user_1',
      clientId: 'client-1',
      scopes: ['pocketly:read'],
    });
    usersService.findByClerkId.mockResolvedValue({
      _id: 'user-doc-1',
      authUserId: 'user_1',
    });

    await expect(
      guard.canActivate(contextWithAuthHeader('Bearer oat_opaque_token')),
    ).resolves.toBe(true);
    expect(connectionModel.updateOne).toHaveBeenCalledWith(
      { authUserId: 'user_1', clientId: 'client-1' },
      {
        $set: {
          scopes: ['pocketly:read', 'pocketly:write'],
          lastSeenAt: expect.any(Date) as Date,
        },
      },
      { upsert: true },
    );
  });
});
