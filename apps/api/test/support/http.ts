import type { Response } from 'supertest';

/**
 * Typed access to an envelope response body ({ data: T }) -- supertest
 * types `Response.body` as `any`, so reading nested fields off it directly
 * trips @typescript-eslint/no-unsafe-member-access everywhere in a spec.
 * This contains the (still-unchecked, but explicit) cast to one place.
 */
export function envelope<T>(res: Response): { data: T } {
  return res.body as { data: T };
}
