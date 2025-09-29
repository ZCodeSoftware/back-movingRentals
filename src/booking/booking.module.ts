import { Module } from '@nestjs/common/decorators/modules';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import { branchesSchema } from '../branches/infrastructure/nest/constants/custom-schema';
import { cartSchema } from '../cart/infrastructure/nest/constants/custom-schema';
import { ticketSchema } from '../ticket/infrastructure/nest/constants/custom-schema';
import { tourSchema } from '../tour/infrastructure/nest/constants/custom-schema';
import { transferSchema } from '../transfer/infrastructure/nest/constants/custom-schema';
import {
  bookingRepository,
  bookingService,
  branchesRepository,
  cartRepository,
  cartService,
  catPaymentMethodRepository,
  catStatusRepository,
  ticketRepository,
  tourRepository,
  transferRepository,
  userRepository,
  userService,
  vehicleRepository,
} from './infrastructure/nest/constants/custom-provider';
import {
  bookingSchema,
  catStatusSchema,
  paymentMethodSchema,
  userSchema,
  vehicleSchema,
} from './infrastructure/nest/constants/custom-schema';
import { BookingController } from './infrastructure/nest/controllers/booking.controller';
import { commissionRepository } from '../commission/infrastructure/nest/constants/custom-provider';
import { commissionSchema } from '../commission/infrastructure/nest/constants/custom-schema';

@Module({
  imports: [
    MongooseModule.forFeature([bookingSchema, paymentMethodSchema, userSchema, vehicleSchema, catStatusSchema, cartSchema, branchesSchema, tourSchema, transferSchema, ticketSchema, commissionSchema]),
    EventEmitterModule.forRoot(),
  ],
  controllers: [BookingController],
  providers: [
    bookingService,
    bookingRepository,
    catPaymentMethodRepository,
    userService,
    userRepository,
    catStatusRepository,
    cartService,
    cartRepository,
    branchesRepository,
    tourRepository,
    vehicleRepository,
    transferRepository,
    ticketRepository,
    commissionRepository
  ],
  exports: [
    bookingService
  ],
})
export class BookingModule { }
