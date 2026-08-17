import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import type { UserDocument } from '../users/schemas/user.schema';
import { CreateFeedbackDto, FeedbackQueryDto } from './dto/feedback.dto';
import { FeedbackDto, FeedbackListDto } from './dto/feedback-response.dto';
import { FeedbackService } from './feedback.service';

@ApiTags('feedback')
@ApiBearerAuth('jwt')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @ApiCreatedResponse({ type: FeedbackDto })
  create(
    @CurrentUser() user: UserDocument,
    @Body() dto: CreateFeedbackDto,
  ) {
    return this.feedbackService.create(user, dto);
  }

  @Get()
  @ApiOkResponse({ type: FeedbackListDto })
  findAll(
    @CurrentUser() user: UserDocument,
    @Query() query: FeedbackQueryDto,
  ) {
    return this.feedbackService.findAll(user, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: FeedbackDto })
  findOne(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
  ) {
    return this.feedbackService.findOne(user, id);
  }

  @Post(':id/upvote')
  @ApiOkResponse({ type: FeedbackDto })
  toggleUpvote(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
  ) {
    return this.feedbackService.toggleUpvote(user, id);
  }

  @Delete(':id')
  @ApiOkResponse({ type: FeedbackDto })
  remove(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
  ) {
    return this.feedbackService.remove(user, id);
  }
}
