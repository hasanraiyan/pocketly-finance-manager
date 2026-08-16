import { z } from 'zod';

/**
 * z.coerce.date() can't be represented in JSON Schema (Zod throws when
 * generating the OpenAPI doc), so validate as an ISO 8601 string and
 * transform to a real Date — same runtime shape, but Swagger-safe.
 */
export const isoDateSchema = z.iso
  .datetime({ offset: true, local: true })
  .transform((value) => new Date(value));
