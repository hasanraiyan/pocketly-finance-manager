import { applyDecorators, UseGuards } from '@nestjs/common';
import { AdminGuard } from './admin.guard';

/**
 * Decorator to enforce admin-only access on a controller or handler method.
 */
export function AdminOnly() {
  return applyDecorators(UseGuards(AdminGuard));
}
