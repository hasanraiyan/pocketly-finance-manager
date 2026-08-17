import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../src/common/auth/public.decorator';
import { UsersService } from '../../src/users/users.service';

/**
 * Stands in for ClerkAuthGuard in e2e tests. Identical contract -- resolves a
 * bearer token to a Pocketly User on `req.user`, honours `@Public()` -- minus
 * the call to Clerk: here the token *is* the Clerk user id. That keeps the
 * flow tests exercising the real module graph, controllers, interceptors and
 * ownership rules without needing a live Clerk instance.
 */
@Injectable()
export class TestAuthGuard implements CanActivate {
  constructor(
    private readonly usersService: UsersService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }

    const clerkUserId = header.slice('Bearer '.length).trim();
    if (!clerkUserId) {
      throw new UnauthorizedException();
    }

    (request as Request & { user: unknown }).user =
      await this.usersService.findOrCreateByClerkId(
        clerkUserId,
        `${clerkUserId}@example.test`,
        'Flow Test User',
      );

    return true;
  }
}
