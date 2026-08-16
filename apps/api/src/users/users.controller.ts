import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { UserDocument } from './schemas/user.schema';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UserDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth('clerk')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOkResponse({ type: UserDto })
  getProfile(@CurrentUser() user: UserDocument) {
    return user;
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    description: 'Account and all owned financial data deleted',
  })
  async deleteAccount(
    @CurrentUser() user: UserDocument,
    // dto is unused: its only job is letting the Zod pipe require { confirm: true } before this runs.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Body() dto: DeleteAccountDto,
  ) {
    await this.usersService.deleteAccount(user);
  }
}
