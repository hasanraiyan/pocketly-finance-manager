import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * `Intl.supportedValuesOf('timeZone')` only enumerates *canonical* zone
 * names -- it omits common aliases (e.g. "Asia/Kolkata", a link to the
 * canonical "Asia/Calcutta") that real browsers report via
 * `Intl.DateTimeFormat().resolvedOptions().timeZone` and that ICU itself
 * happily accepts. Validating against that enumerated set silently
 * rejected valid, commonly-reported timezones for a huge population
 * (confirmed: "Asia/Kolkata" fails the Set check but is a valid zone).
 * Asking the constructor directly accepts canonical names and aliases
 * alike, and still throws on genuinely invalid input.
 */
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
    currency: z.string().length(3).optional(),
    timezone: z
      .string()
      .refine(isValidTimeZone, {
        message: 'Must be a valid IANA timezone (e.g. "Asia/Kolkata")',
      })
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one of currency or timezone must be provided',
  });

export class UpdateProfileDto extends createZodDto(updateProfileSchema) {}
