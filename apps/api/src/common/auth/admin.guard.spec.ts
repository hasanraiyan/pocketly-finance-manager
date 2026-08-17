import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  let guard: AdminGuard;

  beforeEach(() => {
    guard = new AdminGuard();
  });

  function createMockContext(user: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('allows access for users with role="admin"', () => {
    const context = createMockContext({
      role: 'admin',
      email: 'admin@pocketly.app',
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws ForbiddenException for users with role="user"', () => {
    const context = createMockContext({
      role: 'user',
      email: 'user@pocketly.app',
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('throws UnauthorizedException when no user is attached to request', () => {
    const context = createMockContext(null);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
