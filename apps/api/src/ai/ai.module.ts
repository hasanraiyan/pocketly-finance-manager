import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PersonaModule, PersonaService } from '@personaai/nestjs';
import { AuthModule } from '../auth/auth.module';
import { JwtKeysService } from '../auth/jwt-keys.service';
import { SESSION_AUDIENCE, SESSION_ISSUER } from '../auth/auth.service';
import { extractBearerToken } from '../common/auth/bearer-token';

import type { Request } from 'express';

@Module({
  imports: [
    PersonaModule.forRootAsync({
      imports: [ConfigModule, AuthModule],
      inject: [ConfigService, JwtKeysService],
      useFactory: (config: ConfigService, jwtKeys: JwtKeysService) => ({
        baseUrl: config.get<string>(
          'PERSONA_BASE_URL',
          'https://api.persona.hasanraiyan.me',
        ),
        credential:
          config.get<string>('PERSONA_CREDENTIAL') || 'placeholder.placeholder',
        resolveUserFrom: async (req: Request) => {
          const user = (
            req as Request & {
              user?: {
                _id?: { toString(): string };
                id?: { toString(): string };
              };
            }
          ).user;
          if (user?._id) return user._id.toString();
          if (user?.id) return user.id.toString();
          const token = extractBearerToken(req);
          if (!token) return null;
          try {
            const payload = await jwtKeys.verify(token, {
              issuer: SESSION_ISSUER,
              audience: SESSION_AUDIENCE,
            });
            return payload.sub ?? null;
          } catch {
            return null;
          }
        },
        routePrefix: '/api/persona',
        mountPath: '/api/persona',
        capabilities: {
          skills: true,
          mcps: true,
          knowledge: true,
          stores: true,
          agentsWrite: false,
          providers: false,
          auditLogs: false,
          architect: false,
        },
      }),
    }),
  ],
  providers: [PersonaService],
  exports: [PersonaService],
})
export class AiModule {}
