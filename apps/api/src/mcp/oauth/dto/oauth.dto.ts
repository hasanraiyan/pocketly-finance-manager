import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { envelopeSchema } from '../../../common/http/envelope.schema';

export const registerClientSchema = z.object({
  client_name: z.string().max(200).optional(),
  redirect_uris: z.array(z.string().url()).optional(),
  grant_types: z.array(z.string()).optional(),
  response_types: z.array(z.string()).optional(),
  scope: z.string().optional(),
  // 'none' (PKCE-only, no stored secret) or a confidential method
  // ('client_secret_basic'/'client_secret_post', issued a real secret).
  // Omitted defaults to 'none' -- the common case (Claude and most MCP
  // clients register with no auth method at all) stays a public client
  // exactly as before this field existed.
  token_endpoint_auth_method: z
    .enum(['none', 'client_secret_basic', 'client_secret_post'])
    .optional(),
});

export const authorizeQuerySchema = z.object({
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  response_type: z.literal('code').default('code'),
  code_challenge: z.string().min(1),
  code_challenge_method: z.enum(['S256', 'plain']).default('S256'),
  state: z.string().optional(),
  scope: z.string().optional(),
});

export const consentBodySchema = z.object({
  accept: z.boolean(),
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  code_challenge: z.string().min(1),
  code_challenge_method: z.enum(['S256', 'plain']).default('S256'),
  state: z.string().optional(),
  scope: z.string().optional(),
});

export const tokenBodySchema = z.object({
  grant_type: z.literal('authorization_code'),
  code: z.string().min(1),
  client_id: z.string().min(1),
  code_verifier: z.string().min(1),
  redirect_uri: z.string().url().optional(),
  // client_secret_post clients send the secret here; client_secret_basic
  // clients send it via the Authorization header instead (see
  // OAuthController.token, which reads both and passes whichever is set).
  client_secret: z.string().optional(),
});

export const consentResponseSchema = z.object({ url: z.string() });

export class RegisterClientDto extends createZodDto(registerClientSchema) {}
export class AuthorizeQueryDto extends createZodDto(authorizeQuerySchema) {}
export class ConsentBodyDto extends createZodDto(consentBodySchema) {}
export class TokenBodyDto extends createZodDto(tokenBodySchema) {}
export class ConsentResponseDto extends createZodDto(
  envelopeSchema(consentResponseSchema),
) {}
