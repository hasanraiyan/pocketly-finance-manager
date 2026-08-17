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
          'Pocketly session access token, from POST /auth/login or /auth/register. Short-lived (15 minutes) -- use the returned refreshToken with POST /auth/refresh to get a new one.',
      },
      'jwt',
    )
    .build();
}

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  return SwaggerModule.createDocument(app, buildOpenApiConfig());
}
