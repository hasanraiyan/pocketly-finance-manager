// Must be imported before anything else so Sentry can instrument all modules.
import './instrument';

import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { toNodeHandler } from 'better-auth/node';
import express from 'express';
import { auth } from './auth/auth.config';
import { AppModule } from './app.module';
import { requestIdMiddleware } from './common/logging/request-id.middleware';
import { buildOpenApiDocument } from './swagger';

async function bootstrap() {
  // Body parsing is off by default here so Better Auth's handler (mounted
  // below) can read the raw request body itself -- Nest's own json/urlencoded
  // parsers are added back further down, scoped to everything except
  // /api/auth, so they never race Better Auth for the request stream.
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(requestIdMiddleware);

  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: corsOrigins, credentials: true });

  app.use('/api/auth/*splat', toNodeHandler(auth));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.setGlobalPrefix('api/v1');

  const document = buildOpenApiDocument(app);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();
