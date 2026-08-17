import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { extractBearerToken } from '../common/auth/bearer-token';
import { IS_PUBLIC_KEY } from '../common/auth/public.decorator';
import { UsersService } from '../users/users.service';
import { JwtKeysService } from './jwt-keys.service';
import { SESSION_AUDIENCE, SESSION_ISSUER } from './auth.service';

export type SessionAuthenticatedRequest = Request & { sessionId?: string };

/**
 * Global guard (`APP_GUARD`): verifies a Pocketly-issued session access
 * token by signature alone (no DB lookup for the token itself -- that's the
 * point of a stateless access token) and resolves `req.user` from its `sub`
 * claim. Replaces `ClerkAuthGuard`; every existing `@CurrentUser()` call
 * site is unaffected, since the contract (`req.user` is a `UserDocument`)
 * is identical. Also attaches `req.sessionId` from the token's `sid` claim,
 * for `@CurrentSessionId()` -- used only by the sessions endpoints to mark
 * "this device" in the list.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly usersService: UsersService,
    private readonly keys: JwtKeysService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = extractBearerToken(request);
    if (!token) throw new UnauthorizedException();

    let userId: string | undefined;
    let sessionId: string | undefined;
    try {
      const payload = await this.keys.verify(token, {
        issuer: SESSION_ISSUER,
        audience: SESSION_AUDIENCE,
      });
      userId = payload.sub;
      sessionId = typeof payload.sid === 'string' ? payload.sid : undefined;
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }

    if (!userId) throw new UnauthorizedException();

    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();

    (request as Request & { user: unknown }).user = user;
    (request as SessionAuthenticatedRequest).sessionId = sessionId;
    return true;
  }
}
