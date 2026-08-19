import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentSessionId } from '../common/auth/current-session-id.decorator';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { Public } from '../common/auth/public.decorator';
import type { UserDocument } from '../users/schemas/user.schema';
import { AuthService, SessionMeta } from './auth.service';
import { AuthSessionDto, SessionListDto } from './dto/auth-response.dto';
import {
  ChangePasswordDto,
  GoogleLoginDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
} from './dto/auth.dto';

function sessionMeta(req: Request): SessionMeta {
  return {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiCreatedResponse({ type: AuthSessionDto })
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, sessionMeta(req));
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthSessionDto })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, sessionMeta(req));
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthSessionDto })
  google(@Body() dto: GoogleLoginDto, @Req() req: Request) {
    return this.authService.googleLogin(dto, sessionMeta(req));
  }

  // Public: a refresh token is its own credential, not backed by a still-valid
  // access token -- refreshing after the access token expired is the whole
  // point of having one.
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthSessionDto })
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.authService.refresh(dto.refreshToken, sessionMeta(req));
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshDto) {
    await this.authService.logout(dto.refreshToken);
  }

  @Get('sessions')
  @ApiBearerAuth('jwt')
  @ApiOkResponse({ type: SessionListDto })
  async sessions(
    @CurrentUser() user: UserDocument,
    @CurrentSessionId() sessionId: string | undefined,
  ) {
    return { items: await this.authService.listSessions(user._id, sessionId) };
  }

  @Delete('sessions/:id')
  @ApiBearerAuth('jwt')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSession(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
  ) {
    await this.authService.revokeSession(user._id, id);
  }

  @Post('sessions/revoke-others')
  @ApiBearerAuth('jwt')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Every other session was signed out' })
  async revokeOtherSessions(
    @CurrentUser() user: UserDocument,
    @CurrentSessionId() sessionId: string | undefined,
  ) {
    await this.authService.revokeOtherSessions(user._id, sessionId);
  }

  @Patch('password')
  @ApiBearerAuth('jwt')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() user: UserDocument,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      user,
      dto.currentPassword,
      dto.newPassword,
    );
  }
}
