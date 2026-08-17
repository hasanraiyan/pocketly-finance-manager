import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const oauthAuthorizeSchema = z.object({
  client_id: z.string().min(1, 'client_id is required'),
  response_type: z.literal('code'),
  redirect_uri: z.string().url('redirect_uri must be a valid URL'),
  code_challenge: z.string().min(1, 'code_challenge is required'),
  code_challenge_method: z.enum(['S256', 'plain']).default('S256'),
  state: z.string().optional(),
  scope: z.string().optional(),
});

export class OAuthAuthorizeDto extends createZodDto(oauthAuthorizeSchema) {}
