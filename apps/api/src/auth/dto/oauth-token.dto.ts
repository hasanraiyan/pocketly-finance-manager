import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const oauthTokenSchema = z.object({
  grant_type: z.literal('authorization_code'),
  code: z.string().min(1, 'code is required'),
  client_id: z.string().min(1, 'client_id is required'),
  code_verifier: z.string().min(1, 'code_verifier is required'),
  redirect_uri: z.string().optional(),
});

export class OAuthTokenDto extends createZodDto(oauthTokenSchema) {}
