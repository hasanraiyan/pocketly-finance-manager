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
import {
  GoalDto,
  GoalListDto,
  GoalWithProjectionDto,
} from './dto/goal-response.dto';
import {
  ContributeGoalDto,
  CreateGoalDto,
  UpdateGoalDto,
} from './dto/goal.dto';
import { GoalsService } from './goals.service';

@ApiTags('goals')
@ApiBearerAuth('jwt')
@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @ApiCreatedResponse({ type: GoalWithProjectionDto })
  create(@CurrentUser() user: UserDocument, @Body() dto: CreateGoalDto) {
    return this.goalsService.create(user, dto);
  }

  @Get()
  @ApiOkResponse({ type: GoalListDto })
  findAll(
    @CurrentUser() user: UserDocument,
    @Query() query: PaginationQueryDto,
  ) {
    return this.goalsService.findAll(user, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: GoalWithProjectionDto })
  findOne(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.goalsService.findOne(user, id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: GoalWithProjectionDto })
  update(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.goalsService.update(user, id, dto);
  }

  @Post(':id/contributions')
  @ApiOkResponse({ type: GoalWithProjectionDto })
  contribute(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
    @Body() dto: ContributeGoalDto,
  ) {
    return this.goalsService.contribute(user, id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({
    type: GoalDto,
    description: 'The archived (soft-deleted) goal',
  })
  remove(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.goalsService.remove(user, id);
  }
}
