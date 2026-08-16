import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Model } from 'mongoose';
import { McpAuthGuard } from './mcp-auth.guard';
import { McpRevocation } from './schemas/mcp-revocation.schema';
import { UsersService } from '../users/users.service';
import { getMcpResourceClientActions } from '../auth/auth.config';

// Returns the same verifyAccessToken mock on every call, mirroring the real
// getMcpResourceClientActions()'s memoized-singleton behaviour.
jest.mock('../auth/auth.config', () => {
  const verifyAccessToken = jest.fn();
  return {
    getMcpResourceClientActions: () => ({ verifyAccessToken }),
    mcpResourceUri: 'http://localhost:4000/mcp',
  };
});

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
  let usersService: { findByAuthUserId: jest.Mock };
  let revocationModel: { exists: jest.Mock };
  let guard: McpAuthGuard;
  const verifyAccessToken = getMcpResourceClientActions()
    .verifyAccessToken as jest.Mock;

  beforeEach(() => {
    verifyAccessToken.mockReset();
    usersService = { findByAuthUserId: jest.fn() };
    revocationModel = { exists: jest.fn().mockResolvedValue(null) };
    guard = new McpAuthGuard(
      usersService as unknown as UsersService,
      revocationModel as unknown as Model<McpRevocation>,
    );
  });

  it('rejects requests with no bearer token', async () => {
    await expect(
      guard.canActivate(contextWithAuthHeader(undefined)),
    ).rejects.toThrow(UnauthorizedException);
    expect(verifyAccessToken).not.toHaveBeenCalled();
  });

  it('rejects requests when the access token fails verification', async () => {
    verifyAccessToken.mockRejectedValue(new Error('invalid token'));
    await expect(
      guard.canActivate(contextWithAuthHeader('Bearer bad-token')),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a token issued before the connection was revoked', async () => {
    verifyAccessToken.mockResolvedValue({
      sub: 'auth-user-1',
      client_id: 'client-1',
      iat: 1_000,
    });
    revocationModel.exists.mockResolvedValue({ _id: 'revocation-1' });

    await expect(
      guard.canActivate(contextWithAuthHeader('Bearer stale-token')),
    ).rejects.toThrow(UnauthorizedException);
    expect(revocationModel.exists).toHaveBeenCalledWith({
      authUserId: 'auth-user-1',
      clientId: 'client-1',
      createdAt: { $gt: new Date(1_000 * 1000) },
    });
    // A revoked connection is a hard stop -- never reaches the profile
    // lookup, since there's nothing left to authenticate against.
    expect(usersService.findByAuthUserId).not.toHaveBeenCalled();
  });

  it('allows a token issued after the last revocation for that client', async () => {
    verifyAccessToken.mockResolvedValue({
      sub: 'auth-user-1',
      client_id: 'client-1',
      iat: 1_000,
    });
    revocationModel.exists.mockResolvedValue(null);
    const user = { _id: 'user-doc-1', authUserId: 'auth-user-1' };
    usersService.findByAuthUserId.mockResolvedValue(user);

    await expect(
      guard.canActivate(contextWithAuthHeader('Bearer fresh-token')),
    ).resolves.toBe(true);
  });

  it('rejects a valid token for a user with no Pocketly profile yet', async () => {
    verifyAccessToken.mockResolvedValue({ sub: 'auth-user-1' });
    usersService.findByAuthUserId.mockResolvedValue(null);

    await expect(
      guard.canActivate(contextWithAuthHeader('Bearer good-token')),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('attaches the resolved user and token on success', async () => {
    verifyAccessToken.mockResolvedValue({ sub: 'auth-user-1' });
    const user = { _id: 'user-doc-1', authUserId: 'auth-user-1' };
    usersService.findByAuthUserId.mockResolvedValue(user);

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
    };
    expect(authenticated.mcpUser).toBe(user);
    expect(authenticated.mcpToken).toBe('good-token');
  });
});
