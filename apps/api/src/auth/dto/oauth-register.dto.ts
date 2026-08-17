import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const oauthRegisterSchema = z.object({
  client_name: z.string().optional(),
  redirect_uris: z.array(z.string()).optional(),
  grant_types: z.array(z.string()).optional(),
  response_types: z.array(z.string()).optional(),
  scope: z.string().optional(),
});

export class OAuthRegisterDto extends createZodDto(oauthRegisterSchema) {}
