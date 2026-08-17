import type { Request } from 'express';

/** Reads `Authorization: Bearer <token>` — the only place the API itself looks for a token. */
export function extractBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  const token = header.slice('Bearer '.length).trim();
  return token || undefined;
}
