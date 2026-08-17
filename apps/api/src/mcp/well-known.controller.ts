import { ApiExcludeController } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/auth/public.decorator';

/**
 * Protected-resource metadata (RFC 9728) only. Pocketly is no longer an
 * authorization server -- Clerk hosts /authorize, /token, /register (dynamic
 * client registration) and /jwks, and publishes its own
 * `.well-known/oauth-authorization-server`. An MCP client gets here from the
 * `WWW-Authenticate` header on a 401 from /mcp, then follows
 * `authorization_servers` to Clerk.
 */
@ApiExcludeController()
@Controller()
export class WellKnownController {
  @Public()
  @Get([
    '.well-known/oauth-protected-resource',
    '.well-known/oauth-protected-resource/mcp',
  ])
  getProtectedResourceMetadata() {
    const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:4000';
    const authorizationServer = process.env.CLERK_ISSUER_URL;

    return {
      resource: `${apiBaseUrl}/mcp`,
      authorization_servers: authorizationServer ? [authorizationServer] : [],
      // Clerk issues only from its own fixed scope set -- custom scopes
      // aren't supported yet -- so advertising `pocketly:read`/`:write` here
      // would send clients off to request scopes the authorization server
      // will refuse. See GRANTED_SCOPES in mcp-auth.guard.ts.
      scopes_supported: ['openid', 'profile', 'email'],
      bearer_methods_supported: ['header'],
      resource_documentation: `${apiBaseUrl}/docs`,
    };
  }
}
