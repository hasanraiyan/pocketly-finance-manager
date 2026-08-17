import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { decodeJwt } from 'jose';
import { getAuth } from '@clerk/express';
import { Request, Response } from 'express';
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

/**
 * What a verified MCP connection is allowed to do.
 *
 * Clerk's OAuth applications only issue from its own fixed scope set
 * (openid/profile/email/offline_access/metadata/org) -- custom scopes like
 * `pocketly:read` are documented as "not yet available". So there is no way
 * for a user to grant read-only access at the consent screen today: a
 * connection Clerk has authorized gets full read and write.
 *
 * The per-tool `requireScope` checks are kept rather than deleted, because
 * this is the single line that has to change when Clerk ships custom scopes
 * (or if we add a per-connection read-only toggle of our own).
 */
const GRANTED_SCOPES: McpScope[] = ['pocketly:read', 'pocketly:write'];

/**
 * MCP clients authenticate with an OAuth access token issued by Clerk's
 * authorization server (Pocketly is only the protected resource -- see
 * WellKnownController). Clerk verifies the token; the deny-list below is
 * Pocketly's own instant revocation, since an access token stays
 * cryptographically valid until it expires even after a user disconnects.
 */
@Injectable()
export class McpAuthGuard implements CanActivate {
  private readonly apiBaseURL =
    process.env.API_BASE_URL ?? 'http://localhost:4000';

  constructor(
    private readonly usersService: UsersService,
    @InjectModel(McpRevocation.name)
    private readonly revocationModel: Model<McpRevocation>,
    @InjectModel(McpConnection.name)
    private readonly connectionModel: Model<McpConnection>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // The discovery hop: an unauthenticated client reads this header, fetches
    // the resource metadata, and follows it to Clerk to start the OAuth flow.
    const resourceMetadataUrl = `${this.apiBaseURL}/.well-known/oauth-protected-resource/mcp`;
    response.setHeader(
      'WWW-Authenticate',
      `Bearer resource_metadata="${resourceMetadataUrl}"`,
    );

    const token = this.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    // getAuth throws rather than returns when Clerk can't evaluate the
    // request at all (middleware missing, malformed token). Either way the
    // caller isn't authenticated, so this fails closed with a 401 instead of
    // surfacing a 500.
    const auth = this.resolveAuth(request);
    if (!auth?.isAuthenticated) {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    const clerkUserId = auth.userId;

    // Instant revocation, for JWT-format access tokens only: those are
    // verified offline from their signature, so they stay usable after the
    // user disconnects until they expire on their own. "Disconnect" in
    // Settings writes a marker here, and anything issued before it is
    // refused. Opaque tokens (`oat_...`) don't need this -- Clerk checks
    // those against its own store on every verification, so revoking the
    // grant there already takes effect immediately.
    const issuedAt = this.readIssuedAt(token);
    const clientId = auth.clientId;
    if (clientId && issuedAt) {
      const revoked = await this.revocationModel.exists({
        authUserId: clerkUserId,
        clientId,
        createdAt: { $gt: issuedAt },
      });
      if (revoked) {
        throw new UnauthorizedException(
          'This connection was disconnected. Reconnect to grant access again.',
        );
      }
    }

    const user = await this.usersService.findByClerkId(clerkUserId);
    if (!user) {
      throw new UnauthorizedException(
        'Sign in to Pocketly on the web before connecting an MCP client',
      );
    }

    if (clientId) {
      // Records what is connected, for the Settings "Connections" list. An
      // upsert per request is cheap and keeps `lastSeenAt` honest.
      await this.connectionModel.updateOne(
        { authUserId: clerkUserId, clientId },
        {
          // Records what the connection can actually do here, not Clerk's
          // own openid/profile/email grant, which says nothing about
          // Pocketly data and would only confuse the Settings list.
          $set: { scopes: GRANTED_SCOPES, lastSeenAt: new Date() },
        },
        { upsert: true },
      );
    }

    (request as McpAuthenticatedRequest).mcpUser = user;
    (request as McpAuthenticatedRequest).mcpToken = token;
    (request as McpAuthenticatedRequest).mcpScopes = GRANTED_SCOPES;
    return true;
  }

  private resolveAuth(request: Request) {
    try {
      return getAuth(request, { acceptsToken: 'oauth_token' });
    } catch (error) {
      console.error('[mcp] Access token verification failed:', error);
      return null;
    }
  }

  /**
   * `iat` of an already-Clerk-verified JWT access token. Decoding here is
   * safe because verification has happened: the claim is only ever used to
   * reject *more* tokens, never to admit one. Returns undefined for opaque
   * tokens, which have no readable claims.
   */
  private readIssuedAt(token: string): Date | undefined {
    const parts = token.split('.');
    if (parts.length !== 3) return undefined;
    try {
      const { iat } = decodeJwt(token);
      return typeof iat === 'number' ? new Date(iat * 1000) : undefined;
    } catch {
      return undefined;
    }
  }

  private extractBearerToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) return undefined;
    return header.slice('Bearer '.length).trim() || undefined;
  }
}
