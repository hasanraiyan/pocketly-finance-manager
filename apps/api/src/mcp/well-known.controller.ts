import { ApiExcludeController } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/auth/public.decorator';
import { RawResponse } from '../common/http/raw-response.decorator';
import { DEFAULT_MCP_SCOPES } from './oauth/oauth.service';

function apiBaseUrl(): string {
  return process.env.API_BASE_URL ?? 'http://localhost:4000';
}

// The OAuth controller lives under the API's global `/api/v1` prefix (only
// `mcp` and `.well-known/*` are excluded from it in main.ts) -- these
// published URLs have to match that or a client following them 404s.
function oauthBaseUrl(): string {
  return `${apiBaseUrl()}/api/v1`;
}

/**
 * OAuth discovery for MCP clients. Pocketly is now both the protected
 * resource *and* its own authorization server (`mcp/oauth/`) -- no external
 * identity provider to point clients at.
 *
 * Everything here is `@RawResponse()`: these documents are read by generic
 * OAuth clients that look for top-level fields (RFC 9728 / RFC 8414), so the
 * API's usual `{ data: ... }` envelope would make them unparseable.
 */
@ApiExcludeController()
@Controller()
export class WellKnownController {
  @Public()
  @RawResponse()
  @Get([
    '.well-known/oauth-protected-resource',
    '.well-known/oauth-protected-resource/mcp',
  ])
  getProtectedResourceMetadata() {
    const base = apiBaseUrl();
    return {
      resource: `${base}/mcp`,
      authorization_servers: [base],
      scopes_supported: DEFAULT_MCP_SCOPES,
      bearer_methods_supported: ['header'],
      resource_documentation: `${base}/docs`,
    };
  }

  @Public()
  @RawResponse()
  @Get([
    '.well-known/oauth-authorization-server',
    '.well-known/oauth-authorization-server/mcp',
  ])
  getAuthorizationServerMetadata() {
    const base = apiBaseUrl();
    const oauthBase = oauthBaseUrl();
    return {
      issuer: base,
      authorization_endpoint: `${oauthBase}/oauth2/authorize`,
      token_endpoint: `${oauthBase}/oauth2/token`,
      registration_endpoint: `${oauthBase}/oauth2/register`,
      jwks_uri: `${oauthBase}/oauth2/jwks`,
      scopes_supported: DEFAULT_MCP_SCOPES,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      code_challenge_methods_supported: ['S256', 'plain'],
      // 'none' is the common case (PKCE-only, no secret); a client that
      // asks for client_secret_basic/client_secret_post at registration
      // gets a real secret instead -- see OAuthService.registerClient.
      token_endpoint_auth_methods_supported: [
        'none',
        'client_secret_basic',
        'client_secret_post',
      ],
    };
  }
}
