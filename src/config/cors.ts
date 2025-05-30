import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import config from './index';

let whiteListDev: string[] = [];

if (config().app.env === 'dev') {
  whiteListDev = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://0jfvmjkq-5173.brs.devtunnels.ms',
  ];
}

const whiteList = [
  'https://mooving-woad.vercel.app',
  'https://0jfvmjkq-5173.brs.devtunnels.ms',
  'https://moovadventures.com',
  'https://www.moovadventures.com',
  'https://moovadventures.mx',
  'https://www.moovadventures.mx',
  ...whiteListDev,
];

export const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin
    // (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (whiteList.indexOf(origin) === -1) {
      const msg =
        'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
};

@Injectable()
export class CustomCorsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const origin = (req.headers as any).origin;
    if (whiteList.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    );
    res.header(
      'Access-Control-Allow-Methods',
      'GET, POST, OPTIONS, PUT, DELETE',
    );
    res.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
    }

    next();
  }
}
