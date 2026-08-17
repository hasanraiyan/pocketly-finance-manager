import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Resend } from 'resend';
import { UsersService } from '../users/users.service';
import { AuthUser, AuthUserDocument } from './schemas/auth-user.schema';
import {
  AuthSession,
  AuthSessionDocument,
} from './schemas/auth-session.schema';
import {
  AuthToken,
  AuthTokenDocument,
} from './schemas/auth-token.schema';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_REFRESH_THRESHOLD_MS = 15 * 24 * 60 * 60 * 1000; // 15 days
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(AuthUser.name)
    private readonly authUserModel: Model<AuthUserDocument>,
    @InjectModel(AuthSession.name)
    private readonly authSessionModel: Model<AuthSessionDocument>,
    @InjectModel(AuthToken.name)
    private readonly authTokenModel: Model<AuthTokenDocument>,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly usersService: UsersService,
  ) {}

  async signUp(params: {
    email: string;
    password: string;
    name: string;
    ipAddress?: string;
    userAgent?: string;
    webBaseUrl?: string;
  }) {
    const existing = await this.authUserModel
      .findOne({ email: params.email })
      .exec();
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await this.passwordService.hash(params.password);
    const isTest = process.env.NODE_ENV === 'test';
    const authUser = await this.authUserModel.create({
      email: params.email,
      passwordHash,
      emailVerified: isTest, // Auto-verified in test environment
    });

    const userProfile = await this.usersService.findOrCreateByAuthUserId(
      authUser._id.toString(),
      authUser.email,
      params.name,
    );

    const session = await this.createSession({
      userId: authUser._id as Types.ObjectId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    // Send verification email in non-test mode or when not auto-verified
    if (!authUser.emailVerified) {
      const webBaseUrl = params.webBaseUrl ?? process.env.WEB_BASE_URL ?? 'http://localhost:3000';
      await this.dispatchVerificationEmail(authUser.email, webBaseUrl);
    }

    return {
      token: session.rawToken,
      user: {
        id: authUser._id.toString(),
        email: authUser.email,
        name: userProfile.name,
        emailVerified: authUser.emailVerified,
      },
      session: {
        id: session.doc._id.toString(),
        expiresAt: session.doc.expiresAt,
      },
    };
  }

  async signIn(params: {
    email: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
    webBaseUrl?: string;
  }) {
    const authUser = await this.authUserModel
      .findOne({ email: params.email })
      .exec();
    if (!authUser) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await this.passwordService.verify(
      params.password,
      authUser.passwordHash,
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (authUser.banned) {
      throw new UnauthorizedException('Your account has been suspended');
    }

    // Strict Mode: if email is not verified, automatically resend verification link and block login
    if (!authUser.emailVerified) {
      const webBaseUrl = params.webBaseUrl ?? process.env.WEB_BASE_URL ?? 'http://localhost:3000';
      await this.dispatchVerificationEmail(authUser.email, webBaseUrl);
      throw new ForbiddenException(
        'Email not verified. A fresh verification link has been sent to your email.',
      );
    }

    const session = await this.createSession({
      userId: authUser._id as Types.ObjectId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    const userProfile = await this.usersService.findByAuthUserId(
      authUser._id.toString(),
    );

    return {
      token: session.rawToken,
      user: {
        id: authUser._id.toString(),
        email: authUser.email,
        name: userProfile?.name ?? authUser.email.split('@')[0],
        emailVerified: authUser.emailVerified,
      },
      session: {
        id: session.doc._id.toString(),
        expiresAt: session.doc.expiresAt,
      },
    };
  }

  async verifyEmail(params: {
    token: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const tokenHash = this.tokenService.hashToken(params.token);
    const tokenDoc = await this.authTokenModel
      .findOne({
        tokenHash,
        type: 'email_verify',
        expiresAt: { $gt: new Date() },
      })
      .exec();

    if (!tokenDoc) {
      throw new BadRequestException('Invalid or expired verification link');
    }

    const authUser = await this.authUserModel
      .findOne({ email: tokenDoc.identifier })
      .exec();
    if (!authUser) {
      throw new NotFoundException('User not found');
    }

    authUser.emailVerified = true;
    await authUser.save();

    await this.authTokenModel.deleteOne({ _id: tokenDoc._id });

    // Issue session immediately so user is logged in
    const session = await this.createSession({
      userId: authUser._id as Types.ObjectId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    const userProfile = await this.usersService.findByAuthUserId(
      authUser._id.toString(),
    );

    return {
      token: session.rawToken,
      user: {
        id: authUser._id.toString(),
        email: authUser.email,
        name: userProfile?.name ?? authUser.email.split('@')[0],
        emailVerified: true,
      },
      session: {
        id: session.doc._id.toString(),
        expiresAt: session.doc.expiresAt,
      },
    };
  }

  async sendVerificationEmail(email: string, webBaseUrl = 'http://localhost:3000') {
    const authUser = await this.authUserModel.findOne({ email }).exec();
    if (!authUser) {
      return { success: true }; // Prevent email enumeration
    }

    if (authUser.emailVerified) {
      return { success: true, message: 'Email is already verified' };
    }

    await this.dispatchVerificationEmail(authUser.email, webBaseUrl);
    return { success: true, message: 'Verification email sent' };
  }

  private async dispatchVerificationEmail(email: string, webBaseUrl: string) {
    const rawToken = this.tokenService.generateToken(32);
    const tokenHash = this.tokenService.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);

    // Invalidate prior unused verification tokens for this user
    await this.authTokenModel.deleteMany({
      identifier: email,
      type: 'email_verify',
    });

    await this.authTokenModel.create({
      identifier: email,
      tokenHash,
      type: 'email_verify',
      expiresAt,
    });

    const verifyUrl = `${webBaseUrl}/verify-email?token=${rawToken}`;
    await this.sendEmailVerificationLink(email, verifyUrl);
  }

  async createSession(params: {
    userId: Types.ObjectId;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const rawToken = this.tokenService.generateToken(32);
    const tokenHash = this.tokenService.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    const doc = await this.authSessionModel.create({
      userId: params.userId,
      tokenHash,
      expiresAt,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return { rawToken, doc };
  }

  async validateSession(rawToken: string) {
    const tokenHash = this.tokenService.hashToken(rawToken);
    const session = await this.authSessionModel
      .findOne({
        tokenHash,
        expiresAt: { $gt: new Date() },
      })
      .exec();

    if (!session) {
      return null;
    }

    const authUser = await this.authUserModel.findById(session.userId).exec();
    if (!authUser || authUser.banned) {
      return null;
    }

    // Sliding window renewal if session is within 15 days of expiring
    const timeLeft = session.expiresAt.getTime() - Date.now();
    if (timeLeft < SESSION_REFRESH_THRESHOLD_MS) {
      session.expiresAt = new Date(Date.now() + SESSION_TTL_MS);
      await session.save();
    }

    return { authUser, session };
  }

  async signOut(rawToken: string) {
    const tokenHash = this.tokenService.hashToken(rawToken);
    await this.authSessionModel.deleteOne({ tokenHash });
  }

  async forgotPassword(email: string, webBaseUrl = 'http://localhost:3000') {
    const authUser = await this.authUserModel.findOne({ email }).exec();
    if (!authUser) {
      return { success: true }; // Prevent email enumeration
    }

    const rawToken = this.tokenService.generateToken(32);
    const tokenHash = this.tokenService.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await this.authTokenModel.create({
      identifier: authUser.email,
      tokenHash,
      type: 'password_reset',
      expiresAt,
    });

    const resetUrl = `${webBaseUrl}/reset-password?token=${rawToken}`;
    await this.sendResetEmail(authUser.email, resetUrl);

    return { success: true };
  }

  async resetPassword(params: { token: string; newPassword: string }) {
    const tokenHash = this.tokenService.hashToken(params.token);
    const tokenDoc = await this.authTokenModel
      .findOne({
        tokenHash,
        type: 'password_reset',
        expiresAt: { $gt: new Date() },
      })
      .exec();

    if (!tokenDoc) {
      throw new BadRequestException('Invalid or expired password reset link');
    }

    const authUser = await this.authUserModel
      .findOne({
        email: tokenDoc.identifier,
      })
      .exec();
    if (!authUser) {
      throw new NotFoundException('User not found');
    }

    authUser.passwordHash = await this.passwordService.hash(params.newPassword);
    await authUser.save();

    // Revoke all active sessions on password reset
    await this.authSessionModel.deleteMany({ userId: authUser._id });
    await this.authTokenModel.deleteOne({ _id: tokenDoc._id });

    return { success: true };
  }

  async deleteAuthUser(authUserId: string) {
    await this.authSessionModel.deleteMany({ userId: authUserId });
    await this.authUserModel.deleteOne({ _id: authUserId });
  }

  private async sendEmailVerificationLink(email: string, url: string) {
    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress =
      process.env.RESEND_FROM_EMAIL ?? 'Pocketly <onboarding@resend.dev>';

    if (!apiKey) {
      console.log(
        `[auth] RESEND_API_KEY is not set -- logging email verification link for ${email}: ${url}`,
      );
      return;
    }

    try {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: fromAddress,
        to: email,
        subject: 'Verify your Pocketly email address',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
            <h1 style="font-size: 20px; margin: 0 0 12px;">Verify your Pocketly account</h1>
            <p style="font-size: 14px; color: #555; line-height: 1.5; margin: 0 0 24px;">
              Thank you for signing up for Pocketly. Please click the button below to verify your email address.
            </p>
            <a href="${url}" style="display: inline-block; background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: 500;">
              Verify Email
            </a>
            <p style="font-size: 12px; color: #999; margin: 32px 0 0;">
              If you didn't create an account on Pocketly, you can safely ignore this email.
            </p>
          </div>
        `.trim(),
      });
    } catch (err) {
      console.error(`[auth] Error sending verification email to ${email}:`, err);
    }
  }

  private async sendResetEmail(email: string, url: string) {
    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress =
      process.env.RESEND_FROM_EMAIL ?? 'Pocketly <onboarding@resend.dev>';

    if (!apiKey) {
      console.log(
        `[auth] RESEND_API_KEY is not set -- logging reset link for ${email}: ${url}`,
      );
      return;
    }

    try {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: fromAddress,
        to: email,
        subject: 'Reset your Pocketly password',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
            <h1 style="font-size: 20px; margin: 0 0 12px;">Reset your Pocketly password</h1>
            <p style="font-size: 14px; color: #555; line-height: 1.5; margin: 0 0 24px;">
              Click the button below to reset your password. This link will expire shortly.
            </p>
            <a href="${url}" style="display: inline-block; background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: 500;">
              Reset Password
            </a>
            <p style="font-size: 12px; color: #999; margin: 32px 0 0;">
              If you didn't request a password reset, you can safely ignore this email.
            </p>
          </div>
        `.trim(),
      });
    } catch (err) {
      console.error(`[auth] Error sending reset email to ${email}:`, err);
    }
  }
}
