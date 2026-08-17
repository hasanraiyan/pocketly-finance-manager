import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

@Injectable()
export class PasswordService {
  private readonly options = {
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  };

  async hash(password: string): Promise<string> {
    return hash(password, this.options);
  }

  async verify(password: string, hashString: string): Promise<boolean> {
    try {
      return await verify(hashString, password);
    } catch {
      return false;
    }
  }
}
