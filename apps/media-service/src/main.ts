import { initTracing } from '@platform/tracing';

// Must be called BEFORE any other imports to auto-instrument HTTP/DB calls
initTracing({ serviceName: 'media-service' });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { appConfig } from './config/app.config';
import { AllExceptionsFilter, TransformInterceptor } from '@platform/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Media Service')
    .setDescription('The Media Service API description')
    .setVersion('1.0')
    .addTag('media')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: appConfig.CORS_ORIGIN,
    credentials: true,
  });

  await app.listen(appConfig.PORT, '0.0.0.0');
  console.log(`[media-service] Listening on port ${appConfig.PORT}`);
}

bootstrap();
