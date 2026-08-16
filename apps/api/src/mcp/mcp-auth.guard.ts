import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Request, Response } from 'express';
import {
  apiBaseURL,
  mcpIssuer,
  mcpJwksUrl,
  mcpResourceClientActions,
  mcpResourceUri,
} from '../auth/auth.config';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { McpRevocation } from './schemas/mcp-revocation.schema';

const RESOURCE_METADATA_URL = `${apiBaseURL}/.well-known/oauth-protected-resource/mcp`;

export type McpAuthenticatedRequest = Request & {
  mcpUser: UserDocument;
  mcpToken: string;
};

/**
 * Verifies the OAuth-provider-issued access token an MCP client presents --
 * a different token type from the web app's own Better Auth session/bearer
 * tokens, so this does NOT reuse AppAuthGuard. Verification is local (JWT +
 * JWKS, see auth.config.ts), not a database lookup per request.
 */
@Injectable()
export class McpAuthGuard implements CanActivate {
  constructor(
    private readonly usersService: UsersService,
    @InjectModel(McpRevocation.name)
    private readonly revocationModel: Model<McpRevocation>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    // Required by the MCP spec so clients can discover where to find
    // protected-resource metadata from a bare 401, not just on first
    // connect -- see RESOURCE_METADATA_URL.
    response.setHeader(
      'WWW-Authenticate',
      `Bearer resource_metadata="${RESOURCE_METADATA_URL}"`,
    );

    const token = this.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const payload = await mcpResourceClientActions
      .verifyAccessToken(token, {
        verifyOptions: { audience: mcpResourceUri, issuer: mcpIssuer },
        jwksUrl: mcpJwksUrl,
      })
      .catch((error: unknown) => {
        console.error('[mcp] Access token verification failed:', error);
        return null;
      });
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    // JWTs can't be revoked before their natural expiry by nature (no
    // server-side lookup to invalidate) -- this is Pocketly's own
    // lightweight deny-list on top of that, see mcp-revocation.schema.ts.
    // A token issued *before* the newest revocation for this user+client
    // is rejected outright, regardless of its own unexpired `exp`.
    const clientId = (payload.client_id ?? payload.azp) as string | undefined;
    if (clientId && typeof payload.iat === 'number') {
      const issuedAt = new Date(payload.iat * 1000);
      const revoked = await this.revocationModel.exists({
        authUserId: payload.sub,
        clientId,
        createdAt: { $gt: issuedAt },
      });
      if (revoked) {
        throw new UnauthorizedException(
          'This connection was disconnected. Reconnect to grant access again.',
        );
      }
    }

    // The token's user must already have a Pocketly profile -- OAuth
    // consent can only be completed after signing in on the web app, which
    // lazily creates this row the first time a protected page loads. If
    // it's somehow missing, this identity was never actually onboarded.
    const user = await this.usersService.findByAuthUserId(payload.sub);
    if (!user) {
      throw new UnauthorizedException(
        'Sign in to Pocketly on the web before connecting an MCP client',
      );
    }

    (request as McpAuthenticatedRequest).mcpUser = user;
    (request as McpAuthenticatedRequest).mcpToken = token;
    return true;
  }

  private extractBearerToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) return undefined;
    return header.slice('Bearer '.length).trim() || undefined;
  }
}
