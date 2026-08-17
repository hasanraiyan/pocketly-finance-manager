import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Request, Response } from 'express';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { McpRevocation } from './schemas/mcp-revocation.schema';
import { JwtService } from '../auth/oauth/jwt.service';

export type McpAuthenticatedRequest = Request & {
  mcpUser: UserDocument;
  mcpToken: string;
};

@Injectable()
export class McpAuthGuard implements CanActivate {
  private readonly apiBaseURL =
    process.env.API_BASE_URL ?? 'http://localhost:4000';

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectModel(McpRevocation.name)
    private readonly revocationModel: Model<McpRevocation>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const resourceMetadataUrl = `${this.apiBaseURL}/.well-known/oauth-protected-resource/mcp`;
    response.setHeader(
      'WWW-Authenticate',
      `Bearer resource_metadata="${resourceMetadataUrl}"`,
    );

    const token = this.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const payload = await this.jwtService
      .verifyAccessToken(token, {
        audience: `${this.apiBaseURL}/mcp`,
        issuer: `${this.apiBaseURL}/api/auth`,
      })
      .catch((error: unknown) => {
        console.error('[mcp] Access token verification failed:', error);
        return null;
      });

    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid or expired access token');
    }

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
