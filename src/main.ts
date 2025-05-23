import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import 'dotenv/config';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import config from './config';
import { corsOptions } from './config/cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors(corsOptions);
  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true, limit: '5mb' }));
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );
  app.setGlobalPrefix(process.env.APP_GLOBAL_PREFIX);
  const documentationConfig = new DocumentBuilder()
    .setTitle('MovingRentals')
    .setDescription('')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, documentationConfig);
  SwaggerModule.setup('api/docs', app, document);
  await app.listen(config().app.app_port || 3000);
}
bootstrap()
  .then(() => {
    console.log(
      'Listening on: http://localhost:' +
        config().app.app_port +
        '/' +
        config().app.app_global_prefix,
    );
    console.log('Server started successfully 🎸 ');
  })
  .catch((e) => {
    console.log('Server failed to start.');
    console.log(e);
  });
