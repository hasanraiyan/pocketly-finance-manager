import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { extractAccessTokenCookie } from '../../auth/access-token-cookie';
import { JwtKeysService } from '../../auth/jwt-keys.service';
import { SESSION_AUDIENCE, SESSION_ISSUER } from '../../auth/auth.service';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Public } from '../../common/auth/public.decorator';
import { RawResponse } from '../../common/http/raw-response.decorator';
import type { UserDocument } from '../../users/schemas/user.schema';
import {
  AuthorizeQueryDto,
  ConsentBodyDto,
  ConsentResponseDto,
  RegisterClientDto,
  TokenBodyDto,
} from './dto/oauth.dto';
import { OAuthService } from './oauth.service';

function apiBaseUrl(): string {
  return process.env.API_BASE_URL ?? 'http://localhost:4000';
}
function webBaseUrl(): string {
  return process.env.WEB_BASE_URL ?? 'http://localhost:3000';
}
function mcpAudience(): string {
  return `${apiBaseUrl()}/mcp`;
}

/**
 * client_secret_basic (RFC 6749 §2.3.1): `Authorization: Basic
 * base64(client_id:client_secret)`. Only the secret half is used here --
 * OAuthService.authenticateClient checks it against the body's client_id,
 * so a mismatched id in the header just fails that lookup naturally rather
 * than needing a second explicit check.
 */
function extractBasicAuthSecret(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith('Basic ')) return undefined;
  const decoded = Buffer.from(header.slice('Basic '.length), 'base64').toString('utf8');
  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex === -1) return undefined;
  return decoded.slice(separatorIndex + 1);
}

/**
 * Pocketly's own OAuth 2.1 authorization server for MCP clients (Claude,
 * ChatGPT, etc.) -- Dynamic Client Registration, PKCE authorization code
 * flow (mandatory for every client, public or confidential -- see
 * OAuthService.exchangeCodeForToken), and token issuance, replacing the
 * Clerk-hosted equivalent. Public (`none`) clients are the common case and
 * need nothing beyond PKCE; a client that registers with
 * `token_endpoint_auth_method: client_secret_basic` or `client_secret_post`
 * additionally gets a real secret and must present it on every token
 * request (OAuthService.authenticateClient).
 * `/oauth2/authorize` and `/oauth2/token` are the two endpoints a spec MCP
 * client discovers via `.well-known/oauth-authorization-server`
 * (`well-known.controller.ts`) and calls directly; `/oauth2/consent` is
 * called by the web app's own `/mcp-connect` page, not by the MCP client.
 * Only `consent` is documented/typed for SDK consumption -- the rest are
 * RFC-shaped endpoints meant for MCP clients, not Pocketly API consumers.
 */
@ApiTags('oauth2')
@Controller('oauth2')
export class OAuthController {
  constructor(
    private readonly oauth: OAuthService,
    private readonly keys: JwtKeysService,
  ) {}

  // RawResponse: RFC 7591 dictates this shape (client_id, client_name, ...)
  // at the top level -- a compliant client can't parse Pocketly's usual
  // { data: ... } envelope.
  @ApiExcludeEndpoint()
  @Public()
  @RawResponse()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterClientDto) {
    return this.oauth.registerClient(dto);
  }

  /**
   * A plain browser navigation (the MCP client opens this in a tab/webview),
   * so it can't carry a custom `Authorization` header -- only whatever
   * cookies came along. Reads the same access-token cookie the web app
   * mirrors for its own server-rendered pages.
   */
  @ApiExcludeEndpoint()
  @Public()
  @Get('authorize')
  async authorize(
    @Query() query: AuthorizeQueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const client = await this.oauth.getClient(query.client_id);
    if (!client) throw new BadRequestException('Unknown client_id');

    const consentUrl = new URL(`${webBaseUrl()}/mcp-connect`);
    consentUrl.searchParams.set('client_id', query.client_id);
    consentUrl.searchParams.set('client_name', client.clientName);
    consentUrl.searchParams.set('redirect_uri', query.redirect_uri);
    consentUrl.searchParams.set('code_challenge', query.code_challenge);
    consentUrl.searchParams.set(
      'code_challenge_method',
      query.code_challenge_method,
    );
    if (query.state) consentUrl.searchParams.set('state', query.state);
    if (query.scope) consentUrl.searchParams.set('scope', query.scope);

    const authenticated = await this.resolveCookieUser(req);
    if (!authenticated) {
      // The access-token cookie lives on the *web app's* origin (set by
      // AuthProvider client-side), not this API's -- so a cookie check here
      // (a different origin) can never see it. Bounce to sign-in with a
      // same-origin path back to /mcp-connect (not back to this endpoint):
      // the web app's redirect handling only ever does a same-origin
      // client-side navigation, and this API's own origin isn't one.
      const returnTo = `${consentUrl.pathname}${consentUrl.search}`;
      return res.redirect(
        `${webBaseUrl()}/sign-in?redirect=${encodeURIComponent(returnTo)}`,
      );
    }

    return res.redirect(consentUrl.toString());
  }

  /**
   * Called by `/mcp-connect` itself (a normal authenticated page in the web
   * app), not by the MCP client -- so this is a regular Bearer-token route
   * rather than another cookie read.
   */
  @ApiBearerAuth('jwt')
  @ApiOkResponse({ type: ConsentResponseDto })
  @Post('consent')
  @HttpCode(HttpStatus.OK)
  async consent(
    @CurrentUser() user: UserDocument,
    @Body() dto: ConsentBodyDto,
  ) {
    if (!dto.accept) {
      const redirectUrl = new URL(dto.redirect_uri);
      redirectUrl.searchParams.set('error', 'access_denied');
      redirectUrl.searchParams.set(
        'error_description',
        'The user denied the consent request',
      );
      if (dto.state) redirectUrl.searchParams.set('state', dto.state);
      return { url: redirectUrl.toString() };
    }

    const code = await this.oauth.createAuthorizationCode({
      clientId: dto.client_id,
      userId: user._id,
      codeChallenge: dto.code_challenge,
      codeChallengeMethod: dto.code_challenge_method,
      redirectUri: dto.redirect_uri,
      scope: dto.scope ? dto.scope.split(' ') : undefined,
    });

    const redirectUrl = new URL(dto.redirect_uri);
    redirectUrl.searchParams.set('code', code);
    if (dto.state) redirectUrl.searchParams.set('state', dto.state);

    return { url: redirectUrl.toString() };
  }

  // RawResponse: RFC 6749's token response shape (access_token, token_type,
  // ...) is likewise unwrapped by spec.
  @ApiExcludeEndpoint()
  @Public()
  @RawResponse()
  @Post('token')
  @HttpCode(HttpStatus.OK)
  token(@Body() dto: TokenBodyDto, @Req() req: Request) {
    return this.oauth.exchangeCodeForToken({
      code: dto.code,
      clientId: dto.client_id,
      codeVerifier: dto.code_verifier,
      // client_secret_basic sends it via Authorization: Basic <base64(id:secret)>;
      // client_secret_post sends it as a body field instead. A public client
      // sends neither, so both resolve to undefined and authenticateClient
      // treats that client as unauthenticated-by-design (PKCE-only).
      clientSecret: dto.client_secret ?? extractBasicAuthSecret(req),
      issuer: apiBaseUrl(),
      audience: mcpAudience(),
    });
  }

  @ApiExcludeEndpoint()
  @Public()
  @RawResponse()
  @Get('jwks')
  jwks() {
    return this.keys.getJWKS();
  }

  private async resolveCookieUser(req: Request): Promise<boolean> {
    const token = extractAccessTokenCookie(req);
    if (!token) return false;
    try {
      await this.keys.verify(token, {
        issuer: SESSION_ISSUER,
        audience: SESSION_AUDIENCE,
      });
      return true;
    } catch {
      return false;
    }
  }
}
