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
  ) { }

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
    updatedBooking: BookingModel;
    userEmail: string;
    lang: string;
  }) {
    const { updatedBooking, userEmail, lang } = payload;
    await this.notificationEventService.sendBookingCreated(
      updatedBooking,
      userEmail,
      lang,
    );
  }

  @OnEvent('send-user.forgot-password')
  async sendUserForgotPassword(payload: {
    email: string;
    token: string;
    frontendHost: string;
  }) {
    const { email, token, frontendHost } = payload;
    await this.notificationEventService.sendUserForgotPassword(email, token, frontendHost);
  }
}
