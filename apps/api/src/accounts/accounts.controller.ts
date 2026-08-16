import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import type { UserDocument } from '../users/schemas/user.schema';
import { AccountsService } from './accounts.service';
import {
  AccountDto,
  AccountListDto,
  AccountWithBalanceDto,
} from './dto/account-response.dto';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';

@ApiTags('accounts')
@ApiBearerAuth('clerk')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @ApiCreatedResponse({ type: AccountWithBalanceDto })
  create(@CurrentUser() user: UserDocument, @Body() dto: CreateAccountDto) {
    return this.accountsService.create(user._id, dto);
  }

  @Get()
  @ApiOkResponse({ type: AccountListDto })
  findAll(
    @CurrentUser() user: UserDocument,
    @Query() query: PaginationQueryDto,
  ) {
    return this.accountsService.findAll(user._id, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: AccountWithBalanceDto })
  findOne(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.accountsService.findOne(user._id, id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: AccountWithBalanceDto })
  update(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accountsService.update(user._id, id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({
    type: AccountDto,
    description: 'The archived (soft-deleted) account',
  })
  remove(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.accountsService.remove(user._id, id);
  }
}
