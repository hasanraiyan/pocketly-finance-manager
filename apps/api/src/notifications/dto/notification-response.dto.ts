import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { envelopeSchema } from '../../common/http/envelope.schema';
import { NOTIFICATION_TYPES } from '../schemas/notification.schema';

export const notificationItemSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  title: z.string(),
  body: z.string(),
  type: z.enum(NOTIFICATION_TYPES),
  read: z.boolean(),
  actionUrl: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const notificationListResponseSchema = z.object({
  items: z.array(notificationItemSchema),
  unreadCount: z.number(),
  total: z.number(),
});

export class NotificationDto extends createZodDto(
  envelopeSchema(notificationItemSchema),
) {}
export class NotificationListDto extends createZodDto(
  envelopeSchema(notificationListResponseSchema),
) {}
export class UnreadCountDto extends createZodDto(
  envelopeSchema(z.object({ unreadCount: z.number() })),
) {}

export class RegisterDeviceResponseDto extends createZodDto(
  envelopeSchema(z.object({ registered: z.boolean() })),
) {}

export class UnregisterDeviceResponseDto extends createZodDto(
  envelopeSchema(z.object({ unregistered: z.boolean() })),
) {}

export class MarkAllReadResponseDto extends createZodDto(
  envelopeSchema(z.object({ marked: z.number() })),
) {}

export class SendTestNotificationResponseDto extends createZodDto(
  envelopeSchema(
    z.object({
      sent: z.boolean(),
      messageId: z.string().optional(),
    }),
  ),
) {}
