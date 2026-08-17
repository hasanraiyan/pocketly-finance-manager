import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Model } from 'mongoose';
import { McpAuthGuard } from './mcp-auth.guard';
import { McpRevocation } from './schemas/mcp-revocation.schema';
import { UsersService } from '../users/users.service';
import { JwtService } from '../auth/oauth/jwt.service';

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
  let jwtService: { verifyAccessToken: jest.Mock };
  let revocationModel: { exists: jest.Mock };
  let guard: McpAuthGuard;

  beforeEach(() => {
    usersService = { findByAuthUserId: jest.fn() };
    jwtService = { verifyAccessToken: jest.fn() };
    revocationModel = { exists: jest.fn().mockResolvedValue(null) };
    guard = new McpAuthGuard(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      revocationModel as unknown as Model<McpRevocation>,
    );
  });

  it('rejects requests with no bearer token', async () => {
    await expect(
      guard.canActivate(contextWithAuthHeader(undefined)),
    ).rejects.toThrow(UnauthorizedException);
    expect(jwtService.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('rejects requests when the access token fails verification', async () => {
    jwtService.verifyAccessToken.mockRejectedValue(new Error('invalid token'));
    await expect(
      guard.canActivate(contextWithAuthHeader('Bearer bad-token')),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a token issued before the connection was revoked', async () => {
    jwtService.verifyAccessToken.mockResolvedValue({
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
    expect(usersService.findByAuthUserId).not.toHaveBeenCalled();
  });

  it('allows a token issued after the last revocation for that client', async () => {
    jwtService.verifyAccessToken.mockResolvedValue({
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
    jwtService.verifyAccessToken.mockResolvedValue({ sub: 'auth-user-1' });
    usersService.findByAuthUserId.mockResolvedValue(null);

    await expect(
      guard.canActivate(contextWithAuthHeader('Bearer good-token')),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('attaches the resolved user and token on success', async () => {
    jwtService.verifyAccessToken.mockResolvedValue({ sub: 'auth-user-1' });
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
