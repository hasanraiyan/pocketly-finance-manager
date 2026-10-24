import { ExecutionContext } from '@nestjs/common';
import { Model } from 'mongoose';
import { JwtKeysService } from '../auth/jwt-keys.service';
import { McpAuthGuard } from './mcp-auth.guard';
import { OAuthClient } from './oauth/schemas/oauth-client.schema';
import { McpConnection } from './schemas/mcp-connection.schema';
import { McpRevocation } from './schemas/mcp-revocation.schema';
import { UsersService } from '../users/users.service';

function mockResponse() {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  return { setHeader: jest.fn(), status, json };
}

/** Mocks the `.findOne(...).select(...).exec()` chain the guard calls to look up the registered client's name. */
function mockClientModel(clientName: string | null = null) {
  return {
    findOne: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(clientName ? { clientName } : null),
      }),
    }),
  };
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
  let usersService: { findById: jest.Mock };
  let keys: { verify: jest.Mock };
  let revocationModel: { exists: jest.Mock };
  let connectionModel: { updateOne: jest.Mock };
  let clientModel: ReturnType<typeof mockClientModel>;
  let guard: McpAuthGuard;

  beforeEach(() => {
    usersService = { findById: jest.fn() };
    keys = { verify: jest.fn() };
    revocationModel = { exists: jest.fn().mockResolvedValue(null) };
    connectionModel = { updateOne: jest.fn().mockResolvedValue(undefined) };
    clientModel = mockClientModel();
    guard = new McpAuthGuard(
      usersService as unknown as UsersService,
      keys as unknown as JwtKeysService,
      revocationModel as unknown as Model<McpRevocation>,
      connectionModel as unknown as Model<McpConnection>,
      clientModel as unknown as Model<OAuthClient>,
    );
  });

  it('rejects requests with no bearer token', async () => {
    const context = contextWithAuthHeader(undefined);
    await expect(guard.canActivate(context)).resolves.toBe(false);
    expect(keys.verify).not.toHaveBeenCalled();
    expect(context.switchToHttp().getResponse().setHeader).toHaveBeenCalledWith(
      'WWW-Authenticate',
      [
        'Bearer',
        'resource_metadata="http://localhost:4000/.well-known/oauth-protected-resource/mcp"',
      ].join(' '),
    );
  });

  it('rejects a token that fails signature verification', async () => {
    keys.verify.mockRejectedValue(new Error('bad signature'));

    await expect(
      guard.canActivate(contextWithAuthHeader('Bearer bad-token')),
    ).resolves.toBe(false);
  });

  it('rejects a token issued before the connection was revoked', async () => {
    keys.verify.mockResolvedValue({
      sub: 'user-1',
      client_id: 'client-1',
      iat: 1_000,
    });
    revocationModel.exists.mockResolvedValue({ _id: 'revocation-1' });

    await expect(
      guard.canActivate(contextWithAuthHeader('Bearer token')),
    ).resolves.toBe(false);
    expect(revocationModel.exists).toHaveBeenCalledWith({
      userId: 'user-1',
      clientId: 'client-1',
      createdAt: { $gt: new Date(1_000 * 1000) },
    });
    expect(usersService.findById).not.toHaveBeenCalled();
  });

  it('allows a token issued after the last revocation for that client', async () => {
    keys.verify.mockResolvedValue({
      sub: 'user-1',
      client_id: 'client-1',
      iat: 2_000,
      scope: 'pocketly:read',
    });
    revocationModel.exists.mockResolvedValue(null);
    usersService.findById.mockResolvedValue({ _id: 'user-1' });

    await expect(
      guard.canActivate(contextWithAuthHeader('Bearer token')),
    ).resolves.toBe(true);
  });

  it('rejects a valid token for a user with no Pocketly profile (deleted account)', async () => {
    keys.verify.mockResolvedValue({
      sub: 'user-1',
      scope: 'pocketly:read pocketly:write',
    });
    usersService.findById.mockResolvedValue(null);

    await expect(
      guard.canActivate(contextWithAuthHeader('Bearer good-token')),
    ).resolves.toBe(false);
  });

  it('attaches the resolved user, token and scopes on success', async () => {
    keys.verify.mockResolvedValue({
      sub: 'user-1',
      scope: 'pocketly:read pocketly:write',
    });
    const user = { _id: 'user-1' };
    usersService.findById.mockResolvedValue(user);

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

  it('records the connection, including the registered client name, so Settings can list and disconnect it', async () => {
    clientModel = mockClientModel('Claude Desktop');
    guard = new McpAuthGuard(
      usersService as unknown as UsersService,
      keys as unknown as JwtKeysService,
      revocationModel as unknown as Model<McpRevocation>,
      connectionModel as unknown as Model<McpConnection>,
      clientModel as unknown as Model<OAuthClient>,
    );
    keys.verify.mockResolvedValue({
      sub: 'user-1',
      client_id: 'client-1',
      scope: 'pocketly:read pocketly:write',
    });
    usersService.findById.mockResolvedValue({ _id: 'user-1' });

    await expect(
      guard.canActivate(contextWithAuthHeader('Bearer token')),
    ).resolves.toBe(true);
    expect(clientModel.findOne).toHaveBeenCalledWith({ clientId: 'client-1' });
    expect(connectionModel.updateOne).toHaveBeenCalledWith(
      { userId: 'user-1', clientId: 'client-1' },
      {
        $set: {
          scopes: ['pocketly:read', 'pocketly:write'],
          lastSeenAt: expect.any(Date) as Date,
          clientName: 'Claude Desktop',
        },
      },
      { upsert: true },
    );
  });

  it('falls back to no clientName when the client has been deregistered', async () => {
    keys.verify.mockResolvedValue({
      sub: 'user-1',
      client_id: 'client-1',
      scope: 'pocketly:read pocketly:write',
    });
    usersService.findById.mockResolvedValue({ _id: 'user-1' });

    await expect(
      guard.canActivate(contextWithAuthHeader('Bearer token')),
    ).resolves.toBe(true);
    expect(connectionModel.updateOne).toHaveBeenCalledWith(
      { userId: 'user-1', clientId: 'client-1' },
      {
        $set: {
          scopes: ['pocketly:read', 'pocketly:write'],
          lastSeenAt: expect.any(Date) as Date,
        },
      },
      { upsert: true },
    );
  });

  it('skips the connection upsert and revocation check when the token carries no client_id', async () => {
    keys.verify.mockResolvedValue({
      sub: 'user-1',
      scope: 'pocketly:read',
    });
    usersService.findById.mockResolvedValue({ _id: 'user-1' });

    await expect(
      guard.canActivate(contextWithAuthHeader('Bearer token')),
    ).resolves.toBe(true);
    expect(revocationModel.exists).not.toHaveBeenCalled();
    expect(connectionModel.updateOne).not.toHaveBeenCalled();
  });

  it('preserves read-only scope instead of granting write access', async () => {
    keys.verify.mockResolvedValue({
      sub: 'user-1',
      client_id: 'client-1',
      scope: 'pocketly:read',
    });
    usersService.findById.mockResolvedValue({ _id: 'user-1' });

    await expect(
      guard.canActivate(contextWithAuthHeader('Bearer good-token')),
    ).resolves.toBe(true);
    expect(connectionModel.updateOne).toHaveBeenCalledWith(
      { userId: 'user-1', clientId: 'client-1' },
      {
        $set: {
          scopes: ['pocketly:read'],
          lastSeenAt: expect.any(Date) as Date,
        },
      },
      { upsert: true },
    );
  });

  it('rejects tokens without a supported read scope', async () => {
    keys.verify.mockResolvedValue({
      sub: 'user-1',
      scope: 'openid',
    });
    usersService.findById.mockResolvedValue({ _id: 'user-1' });

    await expect(
      guard.canActivate(contextWithAuthHeader('Bearer good-token')),
    ).resolves.toBe(false);
    expect(connectionModel.updateOne).not.toHaveBeenCalled();
  });
});
