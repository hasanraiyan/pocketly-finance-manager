import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

/** Random opaque tokens (refresh tokens, OAuth codes) and their hashed-at-rest form. */
@Injectable()
export class TokenService {
  generateToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString('base64url');
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  timingSafeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }
}
