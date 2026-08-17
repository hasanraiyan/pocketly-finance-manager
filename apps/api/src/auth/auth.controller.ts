import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { SendVerificationEmailDto } from './dto/send-verification-email.dto';
import {
  AuthResponseDto,
  GetSessionResponseDto,
  AuthMessageResponseDto,
} from './dto/auth-response.dto';
import { Public } from '../common/auth/public.decorator';

const COOKIE_NAME = 'pocketly_session';
const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
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
      this.setSessionCookie(res, result.token);
      res.setHeader('set-auth-token', result.token);
    }
    return result;
  }

  @Public()
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

    this.setSessionCookie(res, result.token);
    res.setHeader('set-auth-token', result.token);
    return result;
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

    this.setSessionCookie(res, result.token);
    res.setHeader('set-auth-token', result.token);
    return result;
  }

  @Public()
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
  async signOut(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = this.extractToken(req);
    if (token) {
      await this.authService.signOut(token);
    }
    this.clearSessionCookie(res);
    return { success: true };
  }

  @Public()
  @Get('session')
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

    return {
      user: {
        id: sessionData.authUser._id.toString(),
        email: sessionData.authUser.email,
        emailVerified: sessionData.authUser.emailVerified,
      },
      session: {
        id: sessionData.session._id.toString(),
        userId: sessionData.session.userId.toString(),
        expiresAt: sessionData.session.expiresAt,
      },
    };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthMessageResponseDto })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const webBaseUrl = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
    return this.authService.forgotPassword(dto.email, webBaseUrl);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthMessageResponseDto })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword({
      token: dto.token,
      newPassword: dto.newPassword,
    });
  }

  private setSessionCookie(res: Response, token: string) {
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE_MS,
    });
  }

  private clearSessionCookie(res: Response) {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }

  private extractToken(req: Request): string | undefined {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length).trim();
      if (token) return token;
    }

    if (req.cookies && req.cookies[COOKIE_NAME]) {
      return req.cookies[COOKIE_NAME];
    }

    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(
        new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`),
      );
      if (match) return decodeURIComponent(match[1]);
    }

    return undefined;
  }
}
