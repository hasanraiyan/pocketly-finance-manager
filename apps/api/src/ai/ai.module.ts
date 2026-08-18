import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PersonaModule, PersonaService } from '@personaai/nestjs';

@Module({
  imports: [
    PersonaModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        baseUrl: config.get<string>(
          'PERSONA_BASE_URL',
          'https://api.persona.hasanraiyan.me',
        ),
        credential:
          config.get<string>('PERSONA_CREDENTIAL') ||
          'placeholder.placeholder',
        resolveUserFrom: (req) =>
          req.user?._id?.toString() ?? req.user?.id ?? null,
        routePrefix: '/api/persona',
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
