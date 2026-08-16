import { clerkMiddleware } from '@clerk/express';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { buildOpenApiDocument } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(clerkMiddleware());
  app.setGlobalPrefix('api/v1');

  const document = buildOpenApiDocument(app);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();
