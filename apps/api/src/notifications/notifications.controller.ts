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
import type { UserDocument } from '../users/schemas/user.schema';
import { NotificationsService } from './notifications.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import {
  NotificationDto,
  NotificationListDto,
} from './dto/notification-response.dto';

@ApiTags('notifications')
@ApiBearerAuth('jwt')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('devices')
  @ApiCreatedResponse({ description: 'Register or refresh an FCM device token' })
  registerDevice(
    @CurrentUser() user: UserDocument,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.notificationsService.registerDevice(user, dto);
  }

  @Delete('devices/:token')
  @ApiOkResponse({ description: 'Unregister an FCM device token' })
  unregisterDevice(
    @CurrentUser() user: UserDocument,
    @Param('token') token: string,
  ) {
    return this.notificationsService.unregisterDevice(user, token);
  }

  @Get()
  @ApiOkResponse({ type: NotificationListDto })
  findAll(
    @CurrentUser() user: UserDocument,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Query('unreadOnly') unreadOnly?: boolean,
  ) {
    return this.notificationsService.findAll(user, {
      limit: limit ? Number(limit) : undefined,
      page: page ? Number(page) : undefined,
      unreadOnly: Boolean(unreadOnly),
    });
  }

  @Patch(':id/read')
  @ApiOkResponse({ type: NotificationDto })
  markAsRead(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(user, id);
  }

  @Post('read-all')
  @ApiOkResponse({ description: 'Mark all notifications as read' })
  markAllAsRead(@CurrentUser() user: UserDocument) {
    return this.notificationsService.markAllAsRead(user);
  }

  @Post('test')
  @ApiOkResponse({ description: 'Send a test push notification to current user' })
  sendTestNotification(@CurrentUser() user: UserDocument) {
    return this.notificationsService.sendTestNotification(user);
  }
}
