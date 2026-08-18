import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PersonaModule } from '@personaai/nestjs';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

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
      }),
    }),
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
