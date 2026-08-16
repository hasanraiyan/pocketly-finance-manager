import { clerkMiddleware } from '@clerk/express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(clerkMiddleware());
  app.setGlobalPrefix('api/v1');
  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();
