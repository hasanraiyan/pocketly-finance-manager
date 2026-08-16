import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const deleteAccountSchema = z.object({
  confirm: z.literal(true),
});

export class DeleteAccountDto extends createZodDto(deleteAccountSchema) {}
