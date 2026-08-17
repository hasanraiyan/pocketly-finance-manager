import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import {
  OAuthClient,
  OAuthClientDocument,
} from '../schemas/oauth-client.schema';
import { OAuthCode, OAuthCodeDocument } from '../schemas/oauth-code.schema';
import { TokenService } from '../token.service';
import { JwtService } from './jwt.service';

@Injectable()
export class OAuthService {
  constructor(
    @InjectModel(OAuthClient.name)
    private readonly clientModel: Model<OAuthClientDocument>,
    @InjectModel(OAuthCode.name)
    private readonly codeModel: Model<OAuthCodeDocument>,
    private readonly tokenService: TokenService,
    private readonly jwtService: JwtService,
  ) {}

  async registerClient(params: {
    client_name?: string;
    redirect_uris?: string[];
    grant_types?: string[];
    response_types?: string[];
    scope?: string;
  }) {
    const clientId = `mcp_${this.tokenService.generateToken(16)}`;
    const client = await this.clientModel.create({
      clientId,
      clientName: params.client_name ?? 'MCP Client',
      redirectUris: params.redirect_uris ?? [],
      grantTypes: params.grant_types ?? ['authorization_code'],
      responseTypes: params.response_types ?? ['code'],
      scope: params.scope
        ? params.scope.split(' ')
        : ['openid', 'profile', 'email', 'pocketly:read', 'pocketly:write'],
    });

    return {
      client_id: client.clientId,
      client_name: client.clientName,
      redirect_uris: client.redirectUris,
      grant_types: client.grantTypes,
      response_types: client.responseTypes,
      scope: client.scope.join(' '),
    };
  }

  async getClient(clientId: string): Promise<OAuthClientDocument | null> {
    return this.clientModel.findOne({ clientId }).exec();
  }

  async createAuthorizationCode(params: {
    clientId: string;
    authUserId: string;
    codeChallenge: string;
    codeChallengeMethod?: string;
    redirectUri: string;
    scope?: string[];
  }): Promise<string> {
    const rawCode = this.tokenService.generateToken(32);
    const codeHash = this.tokenService.hashToken(rawCode);

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes TTL

    await this.codeModel.create({
      codeHash,
      clientId: params.clientId,
      authUserId: params.authUserId,
      codeChallenge: params.codeChallenge,
      codeChallengeMethod: params.codeChallengeMethod ?? 'S256',
      redirectUri: params.redirectUri,
      scope: params.scope ?? ['pocketly:read', 'pocketly:write'],
      expiresAt,
    });

    return rawCode;
  }

  async exchangeCodeForToken(params: {
    code: string;
    clientId: string;
    codeVerifier: string;
    redirectUri?: string;
    issuer: string;
    audience: string;
  }) {
    const codeHash = this.tokenService.hashToken(params.code);
    const oauthCode = await this.codeModel
      .findOne({
        codeHash,
        clientId: params.clientId,
      })
      .exec();

    if (!oauthCode) {
      throw new BadRequestException('Invalid or expired authorization code');
    }

    // Single-use code: delete immediately
    await this.codeModel.deleteOne({ _id: oauthCode._id });

    // Validate PKCE
    const isValidVerifier = this.verifyPkce(
      params.codeVerifier,
      oauthCode.codeChallenge,
      oauthCode.codeChallengeMethod,
    );

    if (!isValidVerifier) {
      throw new UnauthorizedException(
        'PKCE verification failed: invalid code_verifier',
      );
    }

    // Issue JWT Access Token
    const scopeStr = oauthCode.scope.join(' ');
    const accessToken = await this.jwtService.signAccessToken({
      sub: oauthCode.authUserId,
      iss: params.issuer,
      aud: params.audience,
      clientId: oauthCode.clientId,
      scope: scopeStr,
      expiresIn: '1h',
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: scopeStr,
    };
  }

  private verifyPkce(
    verifier: string,
    challenge: string,
    method: string,
  ): boolean {
    if (method === 'plain') {
      return verifier === challenge;
    }
    // S256: BASE64URL-ENCODE(SHA256(verifier))
    const hash = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
    return hash === challenge;
  }
}
