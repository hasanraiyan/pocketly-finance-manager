import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const updateProfileSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100).optional(),
    imageUrl: z.string().optional(),
    phone: z.string().max(20).optional(),
    currency: z.string().length(3).optional(),
    timezone: z
      .string()
      .refine(isValidTimeZone, {
        message: 'Must be a valid IANA timezone (e.g. "Asia/Kolkata")',
      })
      .optional(),
    // A flag, not a timestamp: the server stamps the time, so a client
    // can't backdate or forge when onboarding happened.
    onboarded: z.literal(true).optional(),
    dismissChecklist: z.literal(true).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update profile',
  });

export class UpdateProfileDto extends createZodDto(updateProfileSchema) {}
