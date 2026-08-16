import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

export function buildOpenApiConfig() {
  return new DocumentBuilder()
    .setTitle('Pocketly API')
    .setDescription(
      'Core finance domain API for Pocketly: accounts, categories, transactions, budgets, and analysis.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Better Auth session token. Returned in the set-auth-token response header from POST /api/auth/sign-in/email (or /sign-up/email).',
      },
      'jwt',
    )
    .build();
}

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  return SwaggerModule.createDocument(app, buildOpenApiConfig());
}
