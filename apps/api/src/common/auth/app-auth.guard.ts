import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { fromNodeHeaders } from 'better-auth/node';
import { Request } from 'express';
import { getAuth } from '../../auth/auth.config';
import { UsersService } from '../../users/users.service';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class AppAuthGuard implements CanActivate {
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
    const result = await getAuth().api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!result?.user) {
      throw new UnauthorizedException();
    }

    (request as Request & { user: unknown }).user =
      await this.usersService.findOrCreateByAuthUserId(
        result.user.id,
        result.user.email,
        result.user.name,
      );

    return true;
  }
}
