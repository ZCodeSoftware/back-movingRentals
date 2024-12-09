import { MiddlewareConsumer } from '@nestjs/common';
import { Module } from '@nestjs/common/decorators/modules';
import { AddressModule } from './address/address.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BranchesModule } from './branches/branches.module';
import { CatalogsModule } from './catalogs/catalogs.module';
import { CompanyModule } from './company/company.module';
import { CustomCorsMiddleware } from './config/cors';
import { CoreModule } from './core/core.module';
import { DocumentModule } from './document/document.module';
import { NotificationModule } from './notification/notification.module';
import { PriceModule } from './price/price.module';
import { TourModule } from './tour/tour.module';
import { UserModule } from './user/user.module';
import { VehicleModule } from './vehicle/vehicle.module';
import { VehicleOwnerModule } from './vehicleowner/vehicle-owner.module';

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
    AddressModule,
    VehicleOwnerModule,
    VehicleModule,
    TourModule,
    BranchesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CustomCorsMiddleware).forRoutes('*');
  }
}
