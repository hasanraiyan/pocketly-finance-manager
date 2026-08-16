import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { mcpResourceClientActions, mcpResourceUri } from '../auth/auth.config';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';

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
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const payload = await mcpResourceClientActions
      .verifyAccessToken(token, {
        verifyOptions: { audience: mcpResourceUri },
      })
      .catch(() => null);
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid or expired access token');
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
