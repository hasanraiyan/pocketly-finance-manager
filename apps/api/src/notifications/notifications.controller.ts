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
  MarkAllReadResponseDto,
  NotificationDto,
  NotificationListDto,
  RegisterDeviceResponseDto,
  SendTestNotificationResponseDto,
  UnregisterDeviceResponseDto,
} from './dto/notification-response.dto';

@ApiTags('notifications')
@ApiBearerAuth('jwt')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('devices')
  @ApiCreatedResponse({ type: RegisterDeviceResponseDto })
  registerDevice(
    @CurrentUser() user: UserDocument,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.notificationsService.registerDevice(user, dto);
  }

  @Delete('devices/:token')
  @ApiOkResponse({ type: UnregisterDeviceResponseDto })
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
  markAsRead(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.notificationsService.markAsRead(user, id);
  }

  @Post('read-all')
  @ApiOkResponse({ type: MarkAllReadResponseDto })
  markAllAsRead(@CurrentUser() user: UserDocument) {
    return this.notificationsService.markAllAsRead(user);
  }

  @Post('test')
  @ApiOkResponse({ type: SendTestNotificationResponseDto })
  sendTestNotification(@CurrentUser() user: UserDocument) {
    return this.notificationsService.sendTestNotification(user);
  }
}
