import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { JwtKeysService } from '../../auth/jwt-keys.service';
import { TokenService } from '../../auth/token.service';
import {
  OAuthClient,
  OAuthClientDocument,
} from './schemas/oauth-client.schema';
import { OAuthCode, OAuthCodeDocument } from './schemas/oauth-code.schema';
import {
  OAuthConsent,
  OAuthConsentDocument,
} from './schemas/oauth-consent.schema';

/** MCP's actual OAuth 2.1 requirement -- Pocketly grants both or neither today, same as the Clerk-backed version this replaces. */
export const DEFAULT_MCP_SCOPES = ['pocketly:read', 'pocketly:write'];

const CODE_TTL_MS = 5 * 60 * 1000;
const ACCESS_TOKEN_TTL = '1h';

@Injectable()
export class OAuthService {
  constructor(
    @InjectModel(OAuthClient.name)
    private readonly clientModel: Model<OAuthClientDocument>,
    @InjectModel(OAuthCode.name)
    private readonly codeModel: Model<OAuthCodeDocument>,
    @InjectModel(OAuthConsent.name)
    private readonly consentModel: Model<OAuthConsentDocument>,
    private readonly tokens: TokenService,
    private readonly keys: JwtKeysService,
  ) {}

  /** Dynamic Client Registration (RFC 7591) -- what lets Claude and similar clients connect with no human pre-configuring anything. */
  async registerClient(params: {
    client_name?: string;
    redirect_uris?: string[];
    grant_types?: string[];
    response_types?: string[];
    scope?: string;
    token_endpoint_auth_method?: string;
  }) {
    const clientId = `mcp_${this.tokens.generateToken(16)}`;
    const isConfidential =
      params.token_endpoint_auth_method === 'client_secret_basic' ||
      params.token_endpoint_auth_method === 'client_secret_post';

    // Issued once, at registration -- like an authorization code, only the
    // hash is ever persisted, so this is the caller's only chance to see it.
    const rawSecret = isConfidential ? this.tokens.generateToken(32) : null;

    const client = await this.clientModel.create({
      clientId,
      clientName: params.client_name ?? 'MCP Client',
      redirectUris: params.redirect_uris ?? [],
      grantTypes: params.grant_types ?? ['authorization_code'],
      responseTypes: params.response_types ?? ['code'],
      scope: params.scope ? params.scope.split(' ') : DEFAULT_MCP_SCOPES,
      clientSecretHash: rawSecret ? this.tokens.hashToken(rawSecret) : null,
    });

    return {
      client_id: client.clientId,
      client_name: client.clientName,
      redirect_uris: client.redirectUris,
      grant_types: client.grantTypes,
      response_types: client.responseTypes,
      scope: client.scope.join(' '),
      token_endpoint_auth_method: isConfidential
        ? params.token_endpoint_auth_method
        : 'none',
      // RFC 7591 §3.2.1: present (even if only to declare non-expiry) only
      // for a confidential client -- a public client has no secret to expire.
      ...(isConfidential
        ? { client_secret: rawSecret, client_secret_expires_at: 0 }
        : {}),
    };
  }

  async getClient(clientId: string): Promise<OAuthClientDocument | null> {
    return this.clientModel.findOne({ clientId }).exec();
  }

  async createAuthorizationCode(params: {
    clientId: string;
    userId: Types.ObjectId;
    codeChallenge: string;
    codeChallengeMethod?: string;
    redirectUri: string;
    scope?: string[];
  }): Promise<string> {
    const rawCode = this.tokens.generateToken(32);
    const codeHash = this.tokens.hashToken(rawCode);
    const scope = params.scope ?? DEFAULT_MCP_SCOPES;

    await this.codeModel.create({
      codeHash,
      clientId: params.clientId,
      userId: params.userId,
      codeChallenge: params.codeChallenge,
      codeChallengeMethod: params.codeChallengeMethod ?? 'S256',
      redirectUri: params.redirectUri,
      scope,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    });

    await this.consentModel.findOneAndUpdate(
      { userId: params.userId, clientId: params.clientId },
      { userId: params.userId, clientId: params.clientId, scopes: scope },
      { upsert: true },
    );

    return rawCode;
  }

  async getConsents(userId: Types.ObjectId) {
    const consents = await this.consentModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();

    return consents.map((consent) => ({
      id: consent._id.toString(),
      clientId: consent.clientId,
      scopes: consent.scopes,
      createdAt: consent.createdAt.toISOString(),
    }));
  }

  async deleteConsent(userId: Types.ObjectId, consentIdOrClientId: string) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(consentIdOrClientId);
    await this.consentModel.deleteMany({
      userId,
      $or: [
        ...(isObjectId ? [{ _id: consentIdOrClientId }] : []),
        { clientId: consentIdOrClientId },
      ],
    });
    return { success: true };
  }

  async exchangeCodeForToken(params: {
    code: string;
    clientId: string;
    codeVerifier: string;
    clientSecret?: string;
    issuer: string;
    audience: string;
  }) {
    await this.authenticateClient(params.clientId, params.clientSecret);

    const codeHash = this.tokens.hashToken(params.code);
    const oauthCode = await this.codeModel
      .findOne({ codeHash, clientId: params.clientId })
      .exec();

    if (!oauthCode) {
      throw new BadRequestException('Invalid or expired authorization code');
    }

    // Single-use: gone the instant it's looked up, whether or not PKCE below
    // actually checks out -- a failed exchange must not leave a code replayable.
    await this.codeModel.deleteOne({ _id: oauthCode._id });

    if (oauthCode.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired authorization code');
    }

    if (
      !this.verifyPkce(
        params.codeVerifier,
        oauthCode.codeChallenge,
        oauthCode.codeChallengeMethod,
      )
    ) {
      throw new UnauthorizedException(
        'PKCE verification failed: invalid code_verifier',
      );
    }

    const scope = oauthCode.scope.join(' ');
    const accessToken = await this.keys.sign({
      sub: oauthCode.userId.toString(),
      issuer: params.issuer,
      audience: params.audience,
      expiresIn: ACCESS_TOKEN_TTL,
      claims: { client_id: oauthCode.clientId, scope },
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      scope,
    };
  }

  /**
   * A confidential client (registered with a secret) must present it on
   * every token request; a public client (PKCE-only, `none`) has none to
   * present and PKCE alone is its proof of possession -- verifyPkce above
   * still runs unconditionally for both, matching OAuth 2.1's recommendation
   * to require PKCE regardless of client type.
   */
  private async authenticateClient(
    clientId: string,
    clientSecret?: string,
  ): Promise<void> {
    const client = await this.getClient(clientId);
    if (!client) {
      throw new UnauthorizedException('Unknown client_id');
    }

    if (!client.clientSecretHash) return;

    if (!clientSecret) {
      throw new UnauthorizedException(
        'This client is registered as confidential and must authenticate with its client_secret',
      );
    }

    if (
      !this.tokens.timingSafeEqual(
        this.tokens.hashToken(clientSecret),
        client.clientSecretHash,
      )
    ) {
      throw new UnauthorizedException('Invalid client_secret');
    }
  }

  private verifyPkce(
    verifier: string,
    challenge: string,
    method: string,
  ): boolean {
    if (method === 'plain') {
      return this.tokens.timingSafeEqual(verifier, challenge);
    }
    const hash = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
    return this.tokens.timingSafeEqual(hash, challenge);
  }
}
