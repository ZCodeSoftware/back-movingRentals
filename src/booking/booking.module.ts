import { Module } from '@nestjs/common/decorators/modules';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import {
  bookingRepository,
  bookingService,
  catPaymentMethodRepository,
  userRepository,
  userService,
} from './infrastructure/nest/constants/custom-provider';
import {
  bookingSchema,
  paymentMethodSchema,
  userSchema,
} from './infrastructure/nest/constants/custom-schema';
import { BookingController } from './infrastructure/nest/controllers/booking.controller';

@Module({
  imports: [
    MongooseModule.forFeature([bookingSchema, paymentMethodSchema, userSchema]),
    EventEmitterModule.forRoot(),
  ],
  controllers: [BookingController],
  providers: [
    bookingService,
    bookingRepository,
    catPaymentMethodRepository,
    userService,
    userRepository,
  ],
  exports: [],
})
export class BookingModule {}
