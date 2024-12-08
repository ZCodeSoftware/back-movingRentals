import { MiddlewareConsumer } from '@nestjs/common';
import { Module } from '@nestjs/common/decorators/modules';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CatalogsModule } from './catalogs/catalogs.module';
import { CompanyModule } from './company/company.module';
import { CustomCorsMiddleware } from './config/cors';
import { CoreModule } from './core/core.module';
import { DocumentModule } from './document/document.module';
import { NotificationModule } from './notification/notification.module';
import { PriceModule } from './price/price.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    CoreModule,
    NotificationModule,
    CatalogsModule,
    DocumentModule,
    PriceModule,
    UserModule,
    AuthModule,
    CompanyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CustomCorsMiddleware).forRoutes('*');
  }
}
