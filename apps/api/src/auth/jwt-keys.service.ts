import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CryptoKey,
  exportJWK,
  generateKeyPair,
  importJWK,
  JWK,
  jwtVerify,
  JWTPayload,
  SignJWT,
} from 'jose';
import { randomUUID } from 'crypto';
import { SigningKey, SigningKeyDocument } from './schemas/signing-key.schema';

const SINGLETON_NAME = 'primary';
const KID = 'pocketly-key-1';

export interface SignParams {
  sub: string;
  issuer: string;
  audience: string;
  expiresIn: string;
  claims?: Record<string, unknown>;
}

export interface VerifyOptions {
  issuer: string;
  audience: string;
}

/**
 * Signs and verifies every Pocketly-issued JWT with one persisted RS256
 * keypair -- session access tokens and MCP OAuth access tokens alike. One
 * signing mechanism, one JWKS, and (this is the point) one keypair that
 * survives a restart: on first boot it atomically upserts a freshly
 * generated keypair into Mongo, and every other instance -- now or in a
 * future redeploy -- just reads back whichever one won that race.
 */
@Injectable()
export class JwtKeysService implements OnModuleInit {
  private readonly logger = new Logger(JwtKeysService.name);
  private privateKey!: CryptoKey;
  private publicKey!: CryptoKey;
  private publicJwk!: JWK;

  constructor(
    @InjectModel(SigningKey.name)
    private readonly signingKeyModel: Model<SigningKeyDocument>,
  ) {}

  async onModuleInit() {
    let record = await this.signingKeyModel
      .findOne({ name: SINGLETON_NAME })
      .exec();

    if (!record) {
      const { privateKey, publicKey } = await generateKeyPair('RS256', {
        extractable: true,
      });
      const privateJwk = await exportJWK(privateKey);
      const publicJwk = {
        ...(await exportJWK(publicKey)),
        alg: 'RS256',
        use: 'sig',
        kid: KID,
      };

      // Atomic: if another instance already won this race, this is a no-op
      // and the read below picks up whatever it wrote instead.
      await this.signingKeyModel.updateOne(
        { name: SINGLETON_NAME },
        {
          $setOnInsert: {
            name: SINGLETON_NAME,
            kid: KID,
            privateJwk,
            publicJwk,
          },
        },
        { upsert: true },
      );
      record = await this.signingKeyModel
        .findOne({ name: SINGLETON_NAME })
        .exec();
      this.logger.log(
        'Signing key ready (generated or adopted from a concurrent boot)',
      );
    }

    if (!record) {
      throw new Error('Failed to establish a JWT signing key');
    }

    this.publicJwk = record.publicJwk;
    this.privateKey = (await importJWK(
      record.privateJwk as JWK,
      'RS256',
    )) as CryptoKey;
    this.publicKey = (await importJWK(
      record.publicJwk as JWK,
      'RS256',
    )) as CryptoKey;
  }

  getJWKS() {
    return { keys: [this.publicJwk] };
  }

  async sign(params: SignParams): Promise<string> {
    return new SignJWT({ ...params.claims })
      .setProtectedHeader({ alg: 'RS256', kid: this.publicJwk.kid })
      .setSubject(params.sub)
      .setIssuer(params.issuer)
      .setAudience(params.audience)
      .setIssuedAt()
      .setExpirationTime(params.expiresIn)
      .setJti(randomUUID())
      .sign(this.privateKey);
  }

  async verify(token: string, options: VerifyOptions): Promise<JWTPayload> {
    const { payload } = await jwtVerify(token, this.publicKey, options);
    return payload;
  }
}
