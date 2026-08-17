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
  RecurrenceDto,
  RecurrenceListDto,
} from './dto/recurrence-response.dto';
import { CreateRecurrenceDto, UpdateRecurrenceDto } from './dto/recurrence.dto';
import { RecurrencesService } from './recurrences.service';

@ApiTags('recurrences')
@ApiBearerAuth('jwt')
@Controller('recurrences')
export class RecurrencesController {
  constructor(private readonly recurrencesService: RecurrencesService) {}

  @Post()
  @ApiCreatedResponse({ type: RecurrenceDto })
  create(@CurrentUser() user: UserDocument, @Body() dto: CreateRecurrenceDto) {
    return this.recurrencesService.create(user, dto);
  }

  @Get()
  @ApiOkResponse({ type: RecurrenceListDto })
  findAll(
    @CurrentUser() user: UserDocument,
    @Query() query: PaginationQueryDto,
  ) {
    return this.recurrencesService.findAll(user, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: RecurrenceDto })
  findOne(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.recurrencesService.findOne(user, id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: RecurrenceDto })
  update(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
    @Body() dto: UpdateRecurrenceDto,
  ) {
    return this.recurrencesService.update(user, id, dto);
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: RecurrenceDto })
  pause(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.recurrencesService.setPaused(user, id, true);
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: RecurrenceDto })
  resume(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.recurrencesService.setPaused(user, id, false);
  }

  @Delete(':id')
  @ApiOkResponse({
    type: RecurrenceDto,
    description:
      'The archived rule. Transactions it already created are untouched.',
  })
  remove(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.recurrencesService.remove(user, id);
  }
}
