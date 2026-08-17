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
import { MoneyRuleDto, MoneyRuleListDto } from './dto/money-rule-response.dto';
import { CreateMoneyRuleDto, UpdateMoneyRuleDto } from './dto/money-rule.dto';
import { MoneyRulesService } from './money-rules.service';

@ApiTags('money-rules')
@ApiBearerAuth('jwt')
@Controller('money-rules')
export class MoneyRulesController {
  constructor(private readonly rules: MoneyRulesService) {}

  @Post()
  @ApiCreatedResponse({ type: MoneyRuleDto })
  create(@CurrentUser() user: UserDocument, @Body() dto: CreateMoneyRuleDto) {
    return this.rules.create(user, dto);
  }

  @Get()
  @ApiOkResponse({ type: MoneyRuleListDto })
  findAll(
    @CurrentUser() user: UserDocument,
    @Query() query: PaginationQueryDto,
  ) {
    return this.rules.findAll(user, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: MoneyRuleDto })
  findOne(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.rules.findOne(user, id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: MoneyRuleDto })
  update(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
    @Body() dto: UpdateMoneyRuleDto,
  ) {
    return this.rules.update(user, id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({
    type: MoneyRuleDto,
    description: 'The archived (soft-deleted) rule',
  })
  remove(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.rules.remove(user, id);
  }
}
