import 'dotenv/config';
// Must be imported before anything else so Sentry can instrument all modules.
import './instrument';

import { RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { clerkMiddleware } from '@clerk/express';
import { AppModule } from './app.module';
import { requestIdMiddleware } from './common/logging/request-id.middleware';
import { buildOpenApiDocument } from './swagger';

async function bootstrap() {
  // rawBody: Clerk's webhook signature is computed over the exact original
  // bytes, not Nest's re-serialized parsed body.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.use(requestIdMiddleware);

  // Parses the Clerk session token on every request and attaches the auth
  // object; ClerkAuthGuard reads it. authorizedParties pins which origins may
  // present a token, which is what stops a token minted for another app from
  // being replayed against this API.
  const authorizedParties = (process.env.CLERK_AUTHORIZED_PARTIES ?? '')
    .split(',')
    .map((party) => party.trim())
    .filter(Boolean);

  app.use(
    clerkMiddleware(
      authorizedParties.length > 0 ? { authorizedParties } : undefined,
    ),
  );

  const defaultOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://pocketly.hasanraiyan.me',
  ];
  const configuredOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const corsOrigins = Array.from(
    new Set([...defaultOrigins, ...configuredOrigins]),
  );

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'mcp', method: RequestMethod.ALL },
      { path: '.well-known/(.*)', method: RequestMethod.ALL },
      { path: 'webhooks/(.*)', method: RequestMethod.ALL },
    ],
  });

  const document = buildOpenApiDocument(app);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();
