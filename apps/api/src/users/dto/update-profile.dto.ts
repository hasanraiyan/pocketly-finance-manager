import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const IANA_TIME_ZONES = new Set(Intl.supportedValuesOf('timeZone'));

export const updateProfileSchema = z
  .object({
    currency: z.string().length(3).optional(),
    timezone: z
      .string()
      .refine((tz) => IANA_TIME_ZONES.has(tz), {
        message: 'Must be a valid IANA timezone (e.g. "Asia/Kolkata")',
      })
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one of currency or timezone must be provided',
  });

export class UpdateProfileDto extends createZodDto(updateProfileSchema) {}
