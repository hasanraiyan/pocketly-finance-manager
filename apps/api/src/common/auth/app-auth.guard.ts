import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { extractSessionToken } from './session-cookie';
import { AuthService } from '../../auth/auth.service';
import { UsersService } from '../../users/users.service';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class AppAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
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
    const token = extractSessionToken(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    const sessionData = await this.authService.validateSession(token);
    if (!sessionData?.authUser) {
      throw new UnauthorizedException();
    }

    const authUser = sessionData.authUser;
    (request as Request & { user: unknown }).user =
      await this.usersService.findOrCreateByAuthUserId(
        authUser._id.toString(),
        authUser.email,
        authUser.email.split('@')[0],
      );

    return true;
  }
}
