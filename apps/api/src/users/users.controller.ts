import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import { getAuth } from '../auth/auth.config';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { UserDocument } from './schemas/user.schema';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth('jwt')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOkResponse({ type: UserDto })
  getProfile(@CurrentUser() user: UserDocument) {
    return user;
  }

  @Patch('me')
  @ApiOkResponse({ type: UserDto })
  updateProfile(
    @CurrentUser() user: UserDocument,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    description: 'Account and all owned financial data deleted',
  })
  async deleteAccount(
    @CurrentUser() user: UserDocument,
    @Req() request: Request,
    // dto is unused: its only job is letting the Zod pipe require { confirm: true } before this runs.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Body() dto: DeleteAccountDto,
  ) {
    await this.usersService.deleteAccount(user);
    // Erase the identity itself (email/password, sessions) last -- if this
    // fails, the caller still has a valid session to retry, rather than a
    // dangling Better Auth identity with no Pocketly profile behind it.
    await getAuth().api.deleteUser({
      headers: fromNodeHeaders(request.headers),
      body: {},
    });
  }
}
