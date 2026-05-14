import { initTracing } from '@platform/tracing';
initTracing({ serviceName: 'gateway' });

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { appConfig } from './config/app.config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  // Allow all content types (for streaming uploads)
  const fastify = app.getHttpAdapter().getInstance();
  fastify.addContentTypeParser('*', (req: any, payload: any, done: any) => {
    done(null, payload);
  });

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('API Gateway')
    .setDescription('The main entry point for the Cross Platform Software API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  await app.register(require('@fastify/multipart'));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({ origin: appConfig.CORS_ORIGIN, credentials: true });

  await app.listen(appConfig.PORT, '0.0.0.0');
  console.log(`[gateway] Listening on port ${appConfig.PORT}`);
}

bootstrap();
