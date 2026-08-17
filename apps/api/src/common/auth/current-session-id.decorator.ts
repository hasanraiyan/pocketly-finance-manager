import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { SessionAuthenticatedRequest } from '../../auth/jwt-auth.guard';

/** The refresh-token row that minted the caller's access token — see JwtAuthGuard. */
export const CurrentSessionId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<SessionAuthenticatedRequest>();
    return request.sessionId;
  },
);
