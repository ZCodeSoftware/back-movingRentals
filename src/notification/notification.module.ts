import { Module, forwardRef } from '@nestjs/common';
import {
  adminEmailAdapter,
  notificationEventService,
  notificationService,
  userEmailAdapter,
} from './infrastructure/nest/constants/custom-provider';
import { NotificationController } from './infrastructure/nest/controllers/notification.controller';
import { NotificationEventController } from './infrastructure/nest/controllers/notification.events.controller';

import { BookingModule } from '../booking/booking.module';

@Module({
  imports: [forwardRef(() => BookingModule)],
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
