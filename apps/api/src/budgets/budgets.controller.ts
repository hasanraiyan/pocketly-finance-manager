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
import { BudgetsService } from './budgets.service';
import {
  BudgetDto,
  BudgetListDto,
  BudgetWithStatusDto,
} from './dto/budget-response.dto';
import { CreateBudgetDto, UpdateBudgetDto } from './dto/budget.dto';

@ApiTags('budgets')
@ApiBearerAuth('clerk')
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @ApiCreatedResponse({ type: BudgetWithStatusDto })
  create(@CurrentUser() user: UserDocument, @Body() dto: CreateBudgetDto) {
    return this.budgetsService.create(user, dto);
  }

  @Get()
  @ApiOkResponse({ type: BudgetListDto })
  findAll(
    @CurrentUser() user: UserDocument,
    @Query() query: PaginationQueryDto,
  ) {
    return this.budgetsService.findAll(user, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: BudgetWithStatusDto })
  findOne(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.budgetsService.findOne(user, id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: BudgetWithStatusDto })
  update(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(user, id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({
    type: BudgetDto,
    description: 'The archived (soft-deleted) budget',
  })
  remove(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.budgetsService.remove(user, id);
  }
}
