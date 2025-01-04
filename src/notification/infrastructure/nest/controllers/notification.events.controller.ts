import { Controller, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ApiTags } from '@nestjs/swagger';
import { BookingModel } from '../../../../booking/domain/models/booking.model';
import SymbolsNotification from '../../../../notification/symbols-notification';
import { INotificationEventService } from '../../../domain/services/notificacion.event.interface.service';

@ApiTags('Notification Event')
@Controller('notification-event')
export class NotificationEventController {
  constructor(
    @Inject(SymbolsNotification.INotificationEventService)
    private readonly notificationEventService: INotificationEventService,
  ) {}

  @OnEvent('user-email-notification')
  async reservationUserEmail({ email, name }: { email: string; name: string }) {
    await this.notificationEventService.reservationUserEmail(email, name);
  }

  @OnEvent('stock-admin-email-notification')
  async reservationAdminEmail({
    email,
    adminName,
  }: {
    email: string;
    adminName: string;
  }) {
    await this.notificationEventService.reservationAdminEmail(email, adminName);
  }

  @OnEvent('send-booking.created')
  async bookingCreate(payload: {
    bookingSave: BookingModel;
    userEmail: string;
  }) {
    const { bookingSave, userEmail } = payload;
    await this.notificationEventService.sendBookingCreated(
      bookingSave,
      userEmail,
    );
  }
}
