import { initTracing } from '@platform/tracing';

// Must be called BEFORE any other imports to auto-instrument HTTP/DB calls
initTracing({ serviceName: 'auth-service' });

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { appConfig } from './config/app.config';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }), // NestJS logger handles this
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // Strip unknown properties
      forbidNonWhitelisted: true,
      transform: true,       // Auto-transform to DTO class instances
    }),
  );

  app.enableCors({
    origin: appConfig.CORS_ORIGIN,
    credentials: true,
  });

  await app.listen(appConfig.PORT, '0.0.0.0');
  console.log(`[auth-service] Listening on port ${appConfig.PORT}`);
}

bootstrap();
