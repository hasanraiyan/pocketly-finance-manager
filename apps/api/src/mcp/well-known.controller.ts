import { ApiExcludeController } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Redirect,
  ServiceUnavailableException,
} from '@nestjs/common';
import { parsePublishableKey } from '@clerk/shared/keys';
import { Public } from '../common/auth/public.decorator';
import { RawResponse } from '../common/http/raw-response.decorator';

/**
 * OAuth discovery for MCP clients. Pocketly is only the protected resource --
 * Clerk is the authorization server, and hosts /authorize, /token, /register
 * (dynamic client registration) and /jwks.
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
    const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:4000';

    return {
      resource: `${apiBaseUrl}/mcp`,
      authorization_servers: [this.authorizationServer()],
      // Clerk issues only from its own fixed scope set -- custom scopes
      // aren't supported yet -- so advertising `pocketly:read`/`:write` here
      // would send clients off to request scopes the authorization server
      // will refuse. See GRANTED_SCOPES in mcp-auth.guard.ts.
      scopes_supported: ['openid', 'profile', 'email'],
      bearer_methods_supported: ['header'],
      resource_documentation: `${apiBaseUrl}/docs`,
    };
  }

  /**
   * Compatibility hop. A spec-compliant MCP client reads the protected
   * resource document above and follows `authorization_servers` to Clerk.
   * Several clients (ChatGPT's connector among them) instead probe the
   * resource origin for authorization-server metadata -- and older ones hold
   * a cached copy pointing at the endpoints Pocketly used to host itself,
   * which now 404. Redirecting sends all of them to Clerk's real document
   * rather than leaving them stuck.
   */
  @Public()
  @RawResponse()
  @Redirect()
  @Get([
    '.well-known/oauth-authorization-server',
    '.well-known/oauth-authorization-server/mcp',
    '.well-known/oauth-authorization-server/api/auth',
    '.well-known/openid-configuration',
  ])
  redirectToAuthorizationServerMetadata() {
    return {
      url: `${this.authorizationServer()}/.well-known/oauth-authorization-server`,
      statusCode: 302,
    };
  }

  /**
   * Clerk's authorization server origin, derived from the publishable key
   * rather than configured separately: the key already encodes the Frontend
   * API domain, so a dedicated env var could only ever drift out of sync
   * with the instance the rest of the app authenticates against.
   *
   * Throws rather than serving `authorization_servers: []` -- a
   * valid-looking document that silently leaves every client with nowhere
   * to authorize, which is exactly what produced a 404 for the first client
   * that tried to connect.
   */
  private authorizationServer(): string {
    const key = parsePublishableKey(process.env.CLERK_PUBLISHABLE_KEY);
    if (!key) {
      throw new ServiceUnavailableException(
        'MCP is not configured: CLERK_PUBLISHABLE_KEY is unset or invalid, so there is no authorization server to point clients at.',
      );
    }
    return `https://${key.frontendApi}`;
  }
}
