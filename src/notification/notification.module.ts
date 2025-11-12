import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  adminEmailAdapter,
  notificationEventService,
  notificationService,
  userEmailAdapter,
} from './infrastructure/nest/constants/custom-provider';
import { NotificationController } from './infrastructure/nest/controllers/notification.controller';
import { NotificationEventController } from './infrastructure/nest/controllers/notification.events.controller';

import { BookingModule } from '../booking/booking.module';
import { Contract, ContractSchema } from '../core/infrastructure/mongo/schemas/public/contract.schema';

@Module({
  imports: [
    forwardRef(() => BookingModule),
    MongooseModule.forFeature([
      { name: Contract.name, schema: ContractSchema },
    ]),
  ],
  controllers: [NotificationController, NotificationEventController],
  providers: [
    notificationService,
    userEmailAdapter,
    adminEmailAdapter,
    notificationEventService,
  ],
  exports: [],
})
export class NotificationModule {}
