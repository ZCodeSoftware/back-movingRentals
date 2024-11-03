import { Module } from '@nestjs/common';
import { NotificationController } from './infrastructure/nest/controllers/notification.events.controller';
import {
  adminEmailAdapter,
  notificationService,
  userEmailAdapter,
} from './infrastructure/constants/custom-provider';

@Module({
  imports: [],
  controllers: [NotificationController],
  providers: [notificationService, userEmailAdapter, adminEmailAdapter],
  exports: [],
})
export class NotificationModule {}
