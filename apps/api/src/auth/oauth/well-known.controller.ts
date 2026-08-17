import { ApiExcludeController } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/auth/public.decorator';

@ApiExcludeController()
@Controller()
export class WellKnownController {
  @Public()
  @Get([
    '.well-known/oauth-authorization-server',
    '.well-known/oauth-authorization-server/api/auth',
  ])
  getAuthorizationServerMetadata() {
    const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:4000';
    return {
      issuer: `${apiBaseUrl}/api/auth`,
      authorization_endpoint: `${apiBaseUrl}/api/auth/oauth2/authorize`,
      token_endpoint: `${apiBaseUrl}/api/auth/oauth2/token`,
      jwks_uri: `${apiBaseUrl}/api/auth/jwks`,
      registration_endpoint: `${apiBaseUrl}/api/auth/oauth2/register`,
      scopes_supported: [
        'openid',
        'profile',
        'email',
        'pocketly:read',
        'pocketly:write',
      ],
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      code_challenge_methods_supported: ['S256', 'plain'],
      token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
    };
  }

  @Public()
  @Get([
    '.well-known/openid-configuration',
    'api/auth/.well-known/openid-configuration',
  ])
  getOpenIdConfiguration() {
    const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:4000';
    return {
      issuer: `${apiBaseUrl}/api/auth`,
      authorization_endpoint: `${apiBaseUrl}/api/auth/oauth2/authorize`,
      token_endpoint: `${apiBaseUrl}/api/auth/oauth2/token`,
      jwks_uri: `${apiBaseUrl}/api/auth/jwks`,
      userinfo_endpoint: `${apiBaseUrl}/api/auth/session`,
      registration_endpoint: `${apiBaseUrl}/api/auth/oauth2/register`,
      scopes_supported: [
        'openid',
        'profile',
        'email',
        'pocketly:read',
        'pocketly:write',
      ],
      response_types_supported: ['code'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
    };
  }

  @Public()
  @Get([
    '.well-known/oauth-protected-resource',
    '.well-known/oauth-protected-resource/mcp',
  ])
  getProtectedResourceMetadata() {
    const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:4000';
    return {
      resource: `${apiBaseUrl}/mcp`,
      authorization_servers: [`${apiBaseUrl}/api/auth`],
      scopes_supported: ['pocketly:read', 'pocketly:write'],
      bearer_methods_supported: ['header'],
      resource_documentation: `${apiBaseUrl}/docs`,
    };
  }
}
