import {
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
import { ApiTags, ApiOkResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GoogleAuthService } from './oauth/google.service';
import { UsersService } from '../users/users.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { SendVerificationEmailDto } from './dto/send-verification-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RevokeSessionDto } from './dto/revoke-session.dto';
import {
  AuthResponseDto,
  GetSessionResponseDto,
  AuthMessageResponseDto,
  ActiveSessionsListResponseDto,
} from './dto/auth-response.dto';
import { Public } from '../common/auth/public.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post(['sign-up', 'sign-up/email'])
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponseDto })
  async signUp(
    @Body() dto: SignUpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const webBaseUrl = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
    const result = await this.authService.signUp({
      email: dto.email,
      password: dto.password,
      name: dto.name,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      webBaseUrl,
    });

    if (result.token) {
      res.setHeader('set-auth-token', result.token);
    }
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post(['sign-in', 'sign-in/email'])
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponseDto })
  async signIn(
    @Body() dto: SignInDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const webBaseUrl = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
    const result = await this.authService.signIn({
      email: dto.email,
      password: dto.password,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      webBaseUrl,
    });

    res.setHeader('set-auth-token', result.token);
    return result;
  }

  @Public()
  @ApiExcludeEndpoint()
  @Get('google')
  async getGoogleAuthUrl(
    @Query('redirect') redirect: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { url } = await this.googleAuthService.getAuthorizationUrl(redirect);
    if (req.headers.accept?.includes('application/json')) {
      return res.json({ url });
    }
    return res.redirect(url);
  }

  @Public()
  @ApiExcludeEndpoint()
  @Get('callback/google')
  async handleGoogleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const webBaseUrl = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
    try {
      const result = await this.googleAuthService.handleCallback({
        code,
        state,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // Redirect to /auth/callback with JWT token
      const redirectPath = result.webRedirectUri || '/dashboard';
      const callbackRedirectUrl = new URL('/auth/callback', webBaseUrl);
      callbackRedirectUrl.searchParams.set('token', result.token);
      callbackRedirectUrl.searchParams.set('redirect', redirectPath);

      return res.redirect(callbackRedirectUrl.toString());
    } catch (err: any) {
      console.error('[Google OAuth Error]:', err);
      const errorUrl = new URL('/sign-in', webBaseUrl);
      errorUrl.searchParams.set(
        'error',
        err?.message || 'Google sign-in failed',
      );
      return res.redirect(errorUrl.toString());
    }
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponseDto })
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyEmail({
      token: dto.token,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.setHeader('set-auth-token', result.token);
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post(['send-verification-email', 'resend-verification-email'])
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthMessageResponseDto })
  async sendVerificationEmail(@Body() dto: SendVerificationEmailDto) {
    const webBaseUrl = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
    return this.authService.sendVerificationEmail(dto.email, webBaseUrl);
  }

  @Public()
  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthMessageResponseDto })
  async signOut(@Req() req: Request) {
    const token = this.extractToken(req);
    if (token) {
      await this.authService.signOut(token);
    }
    return { success: true };
  }

  @Public()
  @Get(['session', 'get-session'])
  @ApiOkResponse({ type: GetSessionResponseDto })
  async getSession(@Req() req: Request) {
    const token = this.extractToken(req);
    if (!token) {
      return null;
    }

    const sessionData = await this.authService.validateSession(token);
    if (!sessionData) {
      return null;
    }

    const userProfile = await this.usersService.findByAuthUserId(
      sessionData.authUser._id.toString(),
    );

    const defaultExpiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    return {
      user: {
        id: sessionData.authUser._id.toString(),
        email: sessionData.authUser.email,
        name: userProfile?.name ?? sessionData.authUser.email.split('@')[0],
        emailVerified: sessionData.authUser.emailVerified,
      },
      session: {
        id:
          sessionData.session?._id?.toString() ??
          sessionData.authUser._id.toString(),
        userId:
          sessionData.session?.userId?.toString() ??
          sessionData.authUser._id.toString(),
        expiresAt:
          sessionData.session?.expiresAt instanceof Date
            ? sessionData.session.expiresAt.toISOString()
            : typeof sessionData.session?.expiresAt === 'string'
              ? sessionData.session.expiresAt
              : defaultExpiresAt,
      },
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthMessageResponseDto })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const webBaseUrl = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
    return this.authService.forgotPassword(dto.email, webBaseUrl);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthMessageResponseDto })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword({
      token: dto.token,
      newPassword: dto.newPassword,
    });
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthMessageResponseDto })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    const token = this.extractToken(req);
    const sessionData = token
      ? await this.authService.validateSession(token)
      : null;
    if (!sessionData) {
      throw new UnauthorizedException('Authentication required');
    }

    return this.authService.changePassword({
      userId: sessionData.authUser._id.toString(),
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
    });
  }

  @Public()
  @Get('sessions')
  @ApiOkResponse({ type: ActiveSessionsListResponseDto })
  async getSessions(@Req() req: Request) {
    const token = this.extractToken(req);
    const sessionData = token
      ? await this.authService.validateSession(token)
      : null;
    if (!sessionData || !token) {
      return { items: [] };
    }

    const items = await this.authService.getActiveSessions(
      sessionData.authUser._id.toString(),
      token,
    );
    return { items };
  }

  @Public()
  @Post('sessions/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthMessageResponseDto })
  async revokeSession(
    @Body() dto: RevokeSessionDto,
    @Req() req: Request,
  ) {
    const token = this.extractToken(req);
    const sessionData = token
      ? await this.authService.validateSession(token)
      : null;
    if (!sessionData) {
      throw new UnauthorizedException('Authentication required');
    }

    return this.authService.revokeSession(
      sessionData.authUser._id.toString(),
      dto.sessionId,
    );
  }

  @Public()
  @Post('sessions/revoke-others')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthMessageResponseDto })
  async revokeOtherSessions(@Req() req: Request) {
    const token = this.extractToken(req);
    const sessionData = token
      ? await this.authService.validateSession(token)
      : null;
    if (!sessionData || !token) {
      throw new UnauthorizedException('Authentication required');
    }

    return this.authService.revokeOtherSessions(
      sessionData.authUser._id.toString(),
      token,
    );
  }

  private extractToken(req: Request): string | undefined {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length).trim();
      if (token) return token;
    }

    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(
        /(?:^|;\s*)(?:pocketly_auth_token|pocketly_session)=([^;]+)/,
      );
      if (match) return decodeURIComponent(match[1]);
    }

    return undefined;
  }
}
