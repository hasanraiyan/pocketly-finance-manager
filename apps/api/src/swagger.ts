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
        description: 'Pocketly access token, from POST /auth/login',
      },
      'jwt',
    )
    .build();
}

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  return SwaggerModule.createDocument(app, buildOpenApiConfig());
}
