import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoreModule } from './core/core.module';
import { CustomCorsMiddleware } from './config/cors';
import { NotificationModule } from './notification/notification.module';
import { CatalogsModule } from './catalogs/catalogs.module';

@Module({
  imports: [CoreModule, NotificationModule, CatalogsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CustomCorsMiddleware).forRoutes('*');
  }
}
