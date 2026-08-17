import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../common/auth/admin-only.decorator';
import { CurrentUser } from '../common/auth/current-user.decorator';
import {
  AdminFeedbackDto,
  AdminFeedbackListDto,
} from '../feedback/dto/feedback-response.dto';
import {
  AdminFeedbackQueryDto,
  AdminUpdateFeedbackDto,
} from '../feedback/dto/feedback.dto';
import { FeedbackService } from '../feedback/feedback.service';
import { UserDto } from '../users/dto/user-response.dto';
import type { UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminAuditLogService } from './admin-audit-log.service';
import { AdminAnalyticsDto } from './dto/admin-analytics-response.dto';
import {
  AdminAuditLogListDto,
  AuditLogQueryDto,
} from './dto/admin-audit-log-response.dto';
import {
  AdminUserListDto,
  AdminUserQueryDto,
  UpdateUserRoleDto,
} from './dto/admin-user.dto';

@ApiTags('admin')
@ApiBearerAuth('jwt')
@AdminOnly()
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminAnalyticsService: AdminAnalyticsService,
    private readonly feedbackService: FeedbackService,
    private readonly auditLogService: AdminAuditLogService,
    private readonly usersService: UsersService,
  ) {}

  @Get('analytics')
  @ApiOkResponse({ type: AdminAnalyticsDto })
  getAnalytics() {
    return this.adminAnalyticsService.getPlatformAnalytics();
  }

  @Get('feedback')
  @ApiOkResponse({ type: AdminFeedbackListDto })
  getFeedback(@Query() query: AdminFeedbackQueryDto) {
    return this.feedbackService.adminFindAll(query);
  }

  @Patch('feedback/:id')
  @ApiOkResponse({ type: AdminFeedbackDto })
  async updateFeedback(
    @CurrentUser() adminUser: UserDocument,
    @Param('id') id: string,
    @Body() dto: AdminUpdateFeedbackDto,
    @Req() req: Request,
  ) {
    const updated = await this.feedbackService.adminUpdate(id, dto);

    await this.auditLogService.log({
      adminUserId: adminUser._id,
      adminEmail: adminUser.email,
      action: 'feedback.update',
      targetId: id,
      targetType: 'feedback',
      details: dto as Record<string, unknown>,
      ip: req?.ip || req?.socket?.remoteAddress,
    });

    return updated;
  }

  @Delete('feedback/:id')
  @ApiOkResponse({ type: AdminFeedbackDto })
  async deleteFeedback(
    @CurrentUser() adminUser: UserDocument,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const deleted = await this.feedbackService.adminRemove(id);

    await this.auditLogService.log({
      adminUserId: adminUser._id,
      adminEmail: adminUser.email,
      action: 'feedback.delete',
      targetId: id,
      targetType: 'feedback',
      details: { title: deleted.title },
      ip: req?.ip || req?.socket?.remoteAddress,
    });

    return deleted;
  }

  @Get('audit-logs')
  @ApiOkResponse({ type: AdminAuditLogListDto })
  getAuditLogs(@Query() query: AuditLogQueryDto) {
    return this.auditLogService.findAll(query);
  }

  @Get('users')
  @ApiOkResponse({ type: AdminUserListDto })
  getUsers(@Query() query: AdminUserQueryDto) {
    return this.usersService.findAllUsers(query);
  }

  @Patch('users/:id/role')
  @ApiOkResponse({ type: UserDto })
  async updateUserRole(
    @CurrentUser() adminUser: UserDocument,
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @Req() req: Request,
  ) {
    const updated = await this.usersService.setUserRole(id, dto.role);

    await this.auditLogService.log({
      adminUserId: adminUser._id,
      adminEmail: adminUser.email,
      action: 'user.role_update',
      targetId: id,
      targetType: 'user',
      details: { newRole: dto.role },
      ip: req?.ip || req?.socket?.remoteAddress,
    });

    return updated;
  }
}
