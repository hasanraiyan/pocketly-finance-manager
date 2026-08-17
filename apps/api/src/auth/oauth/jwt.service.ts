import { Injectable, OnModuleInit } from '@nestjs/common';
import { exportJWK, generateKeyPair, jwtVerify, SignJWT, JWK } from 'jose';

@Injectable()
export class JwtService implements OnModuleInit {
  private privateKey!: CryptoKey | Uint8Array;
  private publicKey!: CryptoKey | Uint8Array;
  private publicJwk!: JWK;
  private kid = 'pocketly-auth-key-1';

  async onModuleInit() {
    // Generate an RSA keypair for RS256 signing
    const { privateKey, publicKey } = await generateKeyPair('RS256', {
      extractable: true,
    });
    this.privateKey = privateKey;
    this.publicKey = publicKey;

    const jwk = await exportJWK(publicKey);
    this.publicJwk = {
      ...jwk,
      alg: 'RS256',
      use: 'sig',
      kid: this.kid,
    };
  }

  getJWKS() {
    return {
      keys: [this.publicJwk],
    };
  }

  async signAccessToken(params: {
    sub: string;
    iss: string;
    aud: string;
    clientId?: string;
    scope?: string;
    expiresIn?: string;
  }): Promise<string> {
    const { sub, iss, aud, clientId, scope, expiresIn = '1h' } = params;

    const jwt = new SignJWT({
      ...(clientId ? { client_id: clientId, azp: clientId } : {}),
      ...(scope ? { scope } : {}),
    })
      .setProtectedHeader({ alg: 'RS256', kid: this.kid })
      .setSubject(sub)
      .setIssuer(iss)
      .setAudience(aud)
      .setIssuedAt()
      .setExpirationTime(expiresIn);

    return jwt.sign(this.privateKey);
  }

  async verifyAccessToken(
    token: string,
    options: { audience: string; issuer: string },
  ) {
    const { payload } = await jwtVerify(token, this.publicKey, {
      audience: options.audience,
      issuer: options.issuer,
    });
    return payload;
  }
}
