import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

/**
 * Tuned for a web login path -- expensive enough to resist offline cracking,
 * not so much it stalls the request. `algorithm: 2` is `Algorithm.Argon2id`
 * -- the numeric literal, not the enum import, because `@node-rs/argon2`
 * declares it as an ambient `const enum`, which `isolatedModules` (ts-jest,
 * ts-node) can't compile a reference to.
 */
const HASH_OPTIONS = {
  algorithm: 2,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
} as const;

@Injectable()
export class PasswordService {
  hash(password: string): Promise<string> {
    return hash(password, HASH_OPTIONS);
  }

  /** The PHC-format hash string carries its own parameters, so verify needs none. */
  verify(passwordHash: string, password: string): Promise<boolean> {
    return verify(passwordHash, password);
  }
}
