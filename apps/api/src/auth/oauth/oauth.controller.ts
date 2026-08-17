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
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../../common/auth/public.decorator';
import { extractSessionToken } from '../../common/auth/session-cookie';
import { AuthService } from '../auth.service';
import { OAuthRegisterDto } from '../dto/oauth-register.dto';
import { OAuthAuthorizeDto } from '../dto/oauth-authorize.dto';
import { OAuthTokenDto } from '../dto/oauth-token.dto';
import { JwtService } from './jwt.service';
import { OAuthService } from './oauth.service';

import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller('api/auth')
export class OAuthController {
  constructor(
    private readonly oauthService: OAuthService,
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  @Public()
  @Post('oauth2/register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: OAuthRegisterDto) {
    return this.oauthService.registerClient(dto);
  }

  @Public()
  @Get('oauth2/public-client')
  async getPublicClient(@Query('client_id') clientId: string) {
    if (!clientId) {
      throw new BadRequestException('client_id is required');
    }
    const client = await this.oauthService.getClient(clientId);
    if (!client) {
      throw new BadRequestException('Client not found');
    }
    return {
      client_id: client.clientId,
      client_name: client.clientName,
      redirect_uris: client.redirectUris,
    };
  }

  @Public()
  @Get('oauth2/authorize')
  async authorize(
    @Query() query: OAuthAuthorizeDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const webBaseUrl = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
    const client = await this.oauthService.getClient(query.client_id);
    if (!client) {
      throw new BadRequestException('Unknown client_id');
    }

    // Check if user has an active session
    const token = extractSessionToken(req);
    const sessionData = token
      ? await this.authService.validateSession(token)
      : null;

    if (!sessionData) {
      // Redirect to sign in, preserving the entire authorize URL for re-entry
      const originalUrl = req.originalUrl || req.url;
      return res.redirect(
        `${webBaseUrl}/sign-in?redirect=${encodeURIComponent(originalUrl)}`,
      );
    }

    // Redirect to consent page in web app
    const consentUrl = new URL(`${webBaseUrl}/mcp-connect`);
    consentUrl.searchParams.set('client_id', query.client_id);
    consentUrl.searchParams.set('client_name', client.clientName);
    consentUrl.searchParams.set('redirect_uri', query.redirect_uri);
    consentUrl.searchParams.set('code_challenge', query.code_challenge);
    consentUrl.searchParams.set(
      'code_challenge_method',
      query.code_challenge_method ?? 'S256',
    );
    if (query.state) consentUrl.searchParams.set('state', query.state);
    if (query.scope) consentUrl.searchParams.set('scope', query.scope);

    return res.redirect(consentUrl.toString());
  }

  @Public()
  @Post('oauth2/consent')
  @HttpCode(HttpStatus.OK)
  async handleConsent(
    @Body()
    body: {
      accept?: boolean;
      scope?: string;
      oauth_query?: string;
      client_id?: string;
      redirect_uri?: string;
      code_challenge?: string;
      code_challenge_method?: string;
      state?: string;
    },
    @Req() req: Request,
  ) {
    const token = extractSessionToken(req);
    const sessionData = token
      ? await this.authService.validateSession(token)
      : null;
    if (!sessionData) {
      throw new UnauthorizedException('Authentication required');
    }

    // Parse params either from oauth_query string or direct fields
    const queryParams = new URLSearchParams(body.oauth_query ?? '');
    const clientId = body.client_id ?? queryParams.get('client_id');
    const redirectUri = body.redirect_uri ?? queryParams.get('redirect_uri');
    const codeChallenge =
      body.code_challenge ?? queryParams.get('code_challenge');
    const codeChallengeMethod =
      body.code_challenge_method ??
      queryParams.get('code_challenge_method') ??
      'S256';
    const state = body.state ?? queryParams.get('state');
    const scope = body.scope ?? queryParams.get('scope');

    if (!clientId || !redirectUri || !codeChallenge) {
      throw new BadRequestException('Missing required OAuth parameters');
    }

    if (body.accept === false) {
      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set('error', 'access_denied');
      redirectUrl.searchParams.set(
        'error_description',
        'The user denied the consent request',
      );
      if (state) redirectUrl.searchParams.set('state', state);
      return { url: redirectUrl.toString() };
    }

    const code = await this.oauthService.createAuthorizationCode({
      clientId,
      authUserId: sessionData.authUser._id.toString(),
      codeChallenge,
      codeChallengeMethod,
      redirectUri,
      scope: scope ? scope.split(' ') : undefined,
    });

    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('code', code);
    if (state) {
      redirectUrl.searchParams.set('state', state);
    }

    return { url: redirectUrl.toString() };
  }

  @Public()
  @Get('oauth2/get-consents')
  async getConsents(@Req() req: Request) {
    const token = extractSessionToken(req);
    const sessionData = token
      ? await this.authService.validateSession(token)
      : null;
    if (!sessionData) {
      return [];
    }

    return [];
  }

  @Public()
  @Post('oauth2/delete-consent')
  @HttpCode(HttpStatus.OK)
  deleteConsent() {
    // Consent records aren't persisted yet, so there is nothing to revoke.
    return { success: true };
  }

  @Public()
  @Post('oauth2/token')
  @HttpCode(HttpStatus.OK)
  async token(@Body() dto: OAuthTokenDto) {
    const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:4000';
    return this.oauthService.exchangeCodeForToken({
      code: dto.code,
      clientId: dto.client_id,
      codeVerifier: dto.code_verifier,
      redirectUri: dto.redirect_uri,
      issuer: `${apiBaseUrl}/api/auth`,
      audience: `${apiBaseUrl}/mcp`,
    });
  }

  @Public()
  @Get('jwks')
  getJwks() {
    return this.jwtService.getJWKS();
  }
}
