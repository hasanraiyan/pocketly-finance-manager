import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const authUserResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().optional(),
  emailVerified: z.boolean(),
});

export const authSessionResponseSchema = z.object({
  id: z.string(),
  expiresAt: z.string(),
});

export const authResponseSchema = z.object({
  token: z.string(),
  user: authUserResponseSchema,
  session: authSessionResponseSchema,
});

export const getSessionResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    emailVerified: z.boolean(),
  }),
  session: z.object({
    id: z.string(),
    userId: z.string(),
    expiresAt: z.string(),
  }),
});

export const activeSessionResponseSchema = z.object({
  id: z.string(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  expiresAt: z.string(),
  createdAt: z.string(),
  isCurrent: z.boolean(),
});

export const activeSessionsListResponseSchema = z.object({
  items: z.array(activeSessionResponseSchema),
});

export const authMessageResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

export class AuthResponseDto extends createZodDto(authResponseSchema) {}
export class GetSessionResponseDto extends createZodDto(getSessionResponseSchema) {}
export class ActiveSessionResponseDto extends createZodDto(activeSessionResponseSchema) {}
export class ActiveSessionsListResponseDto extends createZodDto(activeSessionsListResponseSchema) {}
export class AuthMessageResponseDto extends createZodDto(authMessageResponseSchema) {}
