import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CatalogsModule } from './catalogs/catalogs.module';
import { CustomCorsMiddleware } from './config/cors';
import { CoreModule } from './core/core.module';
import { DocumentModule } from './document/document.module';
import { NotificationModule } from './notification/notification.module';
import { PriceModule } from './price/price.module';

@Module({
  imports: [CoreModule, NotificationModule, CatalogsModule, DocumentModule, PriceModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CustomCorsMiddleware).forRoutes('*');
  }
}
