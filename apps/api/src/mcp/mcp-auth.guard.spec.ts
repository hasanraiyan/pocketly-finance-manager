import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { McpAuthGuard } from './mcp-auth.guard';
import { UsersService } from '../users/users.service';
import { mcpResourceClientActions } from '../auth/auth.config';

jest.mock('../auth/auth.config', () => ({
  mcpResourceClientActions: { verifyAccessToken: jest.fn() },
  mcpResourceUri: 'http://localhost:4000/mcp',
}));

function contextWithAuthHeader(header?: string): ExecutionContext {
  const request = { headers: { authorization: header } };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('McpAuthGuard', () => {
  let usersService: { findByAuthUserId: jest.Mock };
  let guard: McpAuthGuard;
  const verifyAccessToken =
    mcpResourceClientActions.verifyAccessToken as jest.Mock;

  beforeEach(() => {
    verifyAccessToken.mockReset();
    usersService = { findByAuthUserId: jest.fn() };
    guard = new McpAuthGuard(usersService as unknown as UsersService);
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
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
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
