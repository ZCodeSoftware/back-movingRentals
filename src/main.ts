import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import 'dotenv/config';
import express, { json, urlencoded, raw } from 'express';
import { AppModule } from './app.module';
import config from './config';
import { corsOptions } from './config/cors';

let cachedServer: express.Application;

async function createServer(): Promise<express.Application> {
  if (!cachedServer) {
    // Configurar zona horaria de México (Tulum/Cancún)
    process.env.TZ = 'America/Cancun';
    
    const expressApp = express();
    const adapter = new ExpressAdapter(expressApp);

    const app = await NestFactory.create(AppModule, adapter, {
      logger: ['error', 'warn', 'log'],
      rawBody: true, // Habilitar raw body para webhooks de Stripe
    });

    app.enableCors(corsOptions);
    
    // Global prefix para serverless
    const globalPrefix = process.env.APP_GLOBAL_PREFIX || 'api/v1';
    
    // Configurar raw body solo para el webhook de Stripe
    app.use(`/${globalPrefix}/payments/stripe/webhook`, express.raw({ type: 'application/json' }));
    
    app.use(json({ limit: '5mb' }));
    app.use(urlencoded({ extended: true, limit: '5mb' }));
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    );

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
  // Configurar zona horaria de México (Tulum/Cancún)
  process.env.TZ = 'America/Cancun';
  
  console.log('🌎 Zona horaria configurada:', process.env.TZ);
  console.log('🕐 Hora actual del servidor:', new Date().toLocaleString('es-MX', { 
    timeZone: 'America/Cancun' 
  }));
  
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Habilitar raw body para webhooks de Stripe
  });

  app.enableCors(corsOptions);
  
  // Configurar raw body solo para el webhook de Stripe
  const globalPrefix = process.env.APP_GLOBAL_PREFIX || 'api/v1';
  app.use(`/${globalPrefix}/payments/stripe/webhook`, raw({ type: 'application/json' }));
  
  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true, limit: '5mb' }));
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );
  app.setGlobalPrefix(globalPrefix);

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
