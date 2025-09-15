import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import 'dotenv/config';
import express, { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import config from './config';
import { corsOptions } from './config/cors';

let cachedServer: express.Application;

async function createServer(): Promise<express.Application> {
  if (!cachedServer) {
    const expressApp = express();
    const adapter = new ExpressAdapter(expressApp);

    const app = await NestFactory.create(AppModule, adapter, {
      logger: ['error', 'warn', 'log'],
    });

    app.enableCors(corsOptions);
    app.use(json({ limit: '5mb' }));
    app.use(urlencoded({ extended: true, limit: '5mb' }));
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    );

    // Global prefix para serverless
    const globalPrefix = process.env.APP_GLOBAL_PREFIX || 'api/v1';
    app.setGlobalPrefix(globalPrefix);

    const documentationConfig = new DocumentBuilder()
      .setTitle('MovingRentals')
      .setDescription('')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, documentationConfig);
    SwaggerModule.setup('api/docs', app, document);

    await app.init();
    cachedServer = expressApp;
  }
  return cachedServer;
}

// Función para desarrollo local
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

// Export default para Vercel
export default async (req: any, res: any) => {
  const server = await createServer();
  return server(req, res);
};

// Solo ejecutar bootstrap en desarrollo local
if (process.env.NODE_ENV !== 'production' && require.main === module) {
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
}
