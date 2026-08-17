import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { AuthUser, AuthUserDocument } from '../schemas/auth-user.schema';
import { AuthSession, AuthSessionDocument } from '../schemas/auth-session.schema';
import { AuthToken, AuthTokenDocument } from '../schemas/auth-token.schema';
import { TokenService } from '../token.service';
import { UsersService } from '../../users/users.service';
import { JwtService } from '@nestjs/jwt';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

@Injectable()
export class GoogleAuthService {
  constructor(
    @InjectModel(AuthUser.name)
    private readonly authUserModel: Model<AuthUserDocument>,
    @InjectModel(AuthSession.name)
    private readonly authSessionModel: Model<AuthSessionDocument>,
    @InjectModel(AuthToken.name)
    private readonly authTokenModel: Model<AuthTokenDocument>,
    private readonly tokenService: TokenService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async getAuthorizationUrl(webRedirectUri?: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new BadRequestException('Google OAuth is not configured on the server');
    }

    const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:4000';
    const callbackUrl = `${apiBaseUrl}/api/auth/callback/google`;

    const state = this.tokenService.generateToken(32);
    const codeVerifier = this.tokenService.generateToken(32);
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    // Store state and codeVerifier in auth_tokens
    const statePayload = JSON.stringify({
      codeVerifier,
      webRedirectUri: webRedirectUri || '/dashboard',
    });

    await this.authTokenModel.create({
      identifier: state,
      tokenHash: statePayload,
      type: 'oauth_state',
      expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_MS),
    });

    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', clientId);
    googleAuthUrl.searchParams.set('redirect_uri', callbackUrl);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'openid email profile');
    googleAuthUrl.searchParams.set('state', state);
    googleAuthUrl.searchParams.set('code_challenge', codeChallenge);
    googleAuthUrl.searchParams.set('code_challenge_method', 'S256');
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'select_account');

    return { url: googleAuthUrl.toString(), state };
  }

  async handleCallback(params: {
    code: string;
    state: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Google OAuth credentials not configured');
    }

    const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:4000';
    const callbackUrl = `${apiBaseUrl}/api/auth/callback/google`;

    // Find and consume oauth_state token
    const tokenDoc = await this.authTokenModel.findOne({
      identifier: params.state,
      type: 'oauth_state',
      expiresAt: { $gt: new Date() },
    }).exec();

    if (!tokenDoc) {
      throw new UnauthorizedException('Invalid or expired OAuth state');
    }

    let parsedState: { codeVerifier: string; webRedirectUri?: string } = {
      codeVerifier: '',
      webRedirectUri: '/dashboard',
    };
    try {
      parsedState = JSON.parse(tokenDoc.tokenHash);
    } catch {}

    await this.authTokenModel.deleteOne({ _id: tokenDoc._id });

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: params.code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
        code_verifier: parsedState.codeVerifier,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('[Google OAuth] Token exchange failed:', tokenData);
      throw new UnauthorizedException('Failed to exchange Google authorization code');
    }

    // Fetch user profile from Google
    const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profile = await userinfoResponse.json();
    if (!userinfoResponse.ok || !profile.email) {
      console.error('[Google OAuth] Userinfo request failed:', profile);
      throw new UnauthorizedException('Failed to fetch user profile from Google');
    }

    const email = String(profile.email).toLowerCase().trim();
    const googleId = String(profile.sub);
    const name = profile.name || profile.given_name || email.split('@')[0];

    // Find or create AuthUser
    let authUser = await this.authUserModel.findOne({
      $or: [{ googleId }, { email }],
    }).exec();

    if (authUser) {
      if (authUser.banned) {
        throw new UnauthorizedException('Your account has been suspended');
      }
      if (!authUser.googleId) {
        authUser.googleId = googleId;
      }
      if (!authUser.emailVerified && profile.email_verified) {
        authUser.emailVerified = true;
      }
      await authUser.save();
    } else {
      authUser = await this.authUserModel.create({
        email,
        googleId,
        emailVerified: true,
      });
    }

    // Find or create domain profile in UsersService
    const userProfile = await this.usersService.findOrCreateByAuthUserId(
      authUser._id.toString(),
      authUser.email,
      name,
    );

    // Create active session
    const rawSessionToken = this.tokenService.generateToken(32);
    const tokenHash = this.tokenService.hashToken(rawSessionToken);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    const sessionDoc = await this.authSessionModel.create({
      userId: authUser._id as Types.ObjectId,
      tokenHash,
      expiresAt,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    const jwtToken = await this.jwtService.signAsync({
      sub: authUser._id.toString(),
      sessionId: sessionDoc._id.toString(),
    });

    return {
      token: jwtToken,
      user: {
        id: authUser._id.toString(),
        email: authUser.email,
        name: userProfile.name,
        emailVerified: authUser.emailVerified,
      },
      session: {
        id: sessionDoc._id.toString(),
        expiresAt: sessionDoc.expiresAt,
      },
      webRedirectUri: parsedState.webRedirectUri || '/dashboard',
    };
  }
}
