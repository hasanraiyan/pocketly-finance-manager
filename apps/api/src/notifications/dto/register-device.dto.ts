import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { DEVICE_PLATFORMS } from '../schemas/device-token.schema';

export const registerDeviceSchema = z.object({
  token: z.string().min(10).max(1024),
  platform: z.enum(DEVICE_PLATFORMS).default('web'),
  userAgent: z.string().optional(),
});

export class RegisterDeviceDto extends createZodDto(registerDeviceSchema) {}
