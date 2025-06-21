import { MiddlewareConsumer } from '@nestjs/common';
import { Module } from '@nestjs/common/decorators/modules';
import { AddressModule } from './address/address.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BookingModule } from './booking/booking.module';
import { BranchesModule } from './branches/branches.module';
import { BusinessConfigModule } from './businessconfig/businessconfig.module';
import { CartModule } from './cart/cart.module';
import { CatalogsModule } from './catalogs/catalogs.module';
import { ChoosingModule } from './choosing/choosing.module';
import { CompanyModule } from './company/company.module';
import { CustomCorsMiddleware } from './config/cors';
import { CoreModule } from './core/core.module';
import { DocumentModule } from './document/document.module';
import { ExchageRateModule } from './exchange-rate/exchange-rate.module';
import { FaqModule } from './faq/faq.module';
import { NotificationModule } from './notification/notification.module';
import { PaymentsModule } from './payments/payments.module';
import { PriceModule } from './price/price.module';
import { TicketModule } from './ticket/ticket.module';
import { TourModule } from './tour/tour.module';
import { TransferModule } from './transfer/transfer.module';
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
    TransferModule,
    PaymentsModule,
    BookingModule,
    CartModule,
    ExchageRateModule,
    TicketModule,
    FaqModule,
    ChoosingModule,
    BusinessConfigModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CustomCorsMiddleware).forRoutes('*');
  }
}
