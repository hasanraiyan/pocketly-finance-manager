import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Request, Response } from 'express';
import type { JWTPayload } from 'jose';
import { extractBearerToken } from '../common/auth/bearer-token';
import { JwtKeysService } from '../auth/jwt-keys.service';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { McpScope } from './mcp-context';
import { McpConnection } from './schemas/mcp-connection.schema';
import { McpRevocation } from './schemas/mcp-revocation.schema';

export type McpAuthenticatedRequest = Request & {
  mcpUser: UserDocument;
  mcpToken: string;
  mcpScopes: McpScope[];
};

const GRANTED_SCOPES: McpScope[] = ['pocketly:read', 'pocketly:write'];

function apiBaseUrl(): string {
  return process.env.API_BASE_URL ?? 'http://localhost:4000';
}

/**
 * MCP clients authenticate with an OAuth access token issued by Pocketly's
 * own authorization server (`mcp/oauth/`) -- verified here the same way any
 * self-issued token is, via `JwtKeysService`, scoped to the `/mcp` audience
 * specifically so a regular session token (issued for `pocketly-api`) can't
 * be replayed here or vice versa.
 */
@Injectable()
export class McpAuthGuard implements CanActivate {
  constructor(
    private readonly usersService: UsersService,
    private readonly keys: JwtKeysService,
    @InjectModel(McpRevocation.name)
    private readonly revocationModel: Model<McpRevocation>,
    @InjectModel(McpConnection.name)
    private readonly connectionModel: Model<McpConnection>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const resourceMetadataUrl = `${apiBaseUrl()}/.well-known/oauth-protected-resource/mcp`;
    response.setHeader(
      'WWW-Authenticate',
      `Bearer resource_metadata="${resourceMetadataUrl}"`,
    );

    const token = extractBearerToken(request);
    if (!token) throw new UnauthorizedException('Missing bearer token');

    let payload: JWTPayload;
    try {
      payload = await this.keys.verify(token, {
        issuer: apiBaseUrl(),
        audience: `${apiBaseUrl()}/mcp`,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    const userId = payload.sub;
    const clientId = payload.client_id as string | undefined;
    if (!userId) throw new UnauthorizedException();

    // Instant revocation: a disconnect writes a marker here newer than the
    // token's own `iat`, so even an unexpired token stops working right
    // away rather than up to an hour later. Self-cleaning via the schema's
    // TTL index once no live token could still predate it.
    if (clientId && payload.iat) {
      const revoked = await this.revocationModel.exists({
        userId,
        clientId,
        createdAt: { $gt: new Date(payload.iat * 1000) },
      });
      if (revoked) {
        throw new UnauthorizedException(
          'This connection was disconnected. Reconnect to grant access again.',
        );
      }
    }

    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();

    if (clientId) {
      await this.connectionModel.updateOne(
        { userId, clientId },
        { $set: { scopes: GRANTED_SCOPES, lastSeenAt: new Date() } },
        { upsert: true },
      );
    }

    (request as McpAuthenticatedRequest).mcpUser = user;
    (request as McpAuthenticatedRequest).mcpToken = token;
    (request as McpAuthenticatedRequest).mcpScopes = GRANTED_SCOPES;
    return true;
  }
}
