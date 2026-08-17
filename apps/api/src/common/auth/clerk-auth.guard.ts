import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { clerkClient, getAuth } from '@clerk/express';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * Global guard (`APP_GUARD`): Clerk owns identity, Pocketly owns the profile.
 * `clerkMiddleware()` (main.ts) has already parsed the session token by the
 * time this runs -- `getAuth` only reads what it attached, no network call.
 */
@Injectable()
export class ClerkAuthGuard implements CanActivate {
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
    // getAuth throws (rather than returning an unauthenticated object) when
    // Clerk can't evaluate the request at all -- e.g. clerkMiddleware never
    // ran. That is still "not authenticated", so fail closed with a 401
    // rather than letting it surface as a 500.
    let userId: string | null = null;
    try {
      userId = getAuth(request).userId;
    } catch {
      throw new UnauthorizedException();
    }

    if (!userId) {
      throw new UnauthorizedException();
    }

    const existing = await this.usersService.findByClerkId(userId);
    if (existing) {
      (request as Request & { user: unknown }).user = existing;
      return true;
    }

    // First request from a Clerk user we've never seen. Fetching the profile
    // from Clerk costs a Backend API call, so it deliberately happens only on
    // this path -- never on the hot path above. `user.updated` webhooks keep
    // the copy fresh afterwards.
    try {
      const clerkUser = await clerkClient.users.getUser(userId);
      const email =
        clerkUser.primaryEmailAddress?.emailAddress ??
        clerkUser.emailAddresses?.[0]?.emailAddress;

      if (!email) {
        throw new UnauthorizedException('Clerk user has no email address');
      }

      const name =
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
        clerkUser.username ||
        email.split('@')[0];

      (request as Request & { user: unknown }).user =
        await this.usersService.findOrCreateByClerkId(
          userId,
          email,
          name,
          clerkUser.imageUrl,
        );

      return true;
    } catch (err) {
      const fallback = await this.usersService.findByClerkId(userId);
      if (fallback) {
        (request as Request & { user: unknown }).user = fallback;
        return true;
      }
      throw err;
    }
  }
}
