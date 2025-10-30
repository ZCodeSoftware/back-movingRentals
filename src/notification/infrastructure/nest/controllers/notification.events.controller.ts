import { Controller, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ApiTags } from '@nestjs/swagger';
import { BookingModel } from '../../../../booking/domain/models/booking.model';
import { ContractModel } from '../../../../contract/domain/models/contract.model';
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
    console.log('[NotificationEventController] 🎯 Evento send-booking.created recibido');
    console.log('[NotificationEventController] Payload:', {
      hasBooking: !!payload.updatedBooking,
      userEmail: payload.userEmail,
      lang: payload.lang,
      bookingId: payload.updatedBooking?.toJSON?.()?._id,
      isReserve: payload.updatedBooking?.toJSON?.()?.isReserve
    });
    
    try {
      const { updatedBooking, userEmail, lang } = payload;
      await this.notificationEventService.sendBookingCreated(
        updatedBooking,
        userEmail,
        lang,
      );
      console.log('[NotificationEventController] ✅ Email enviado exitosamente');
    } catch (error) {
      console.error('[NotificationEventController] ❌ Error enviando email:', error);
      throw error;
    }
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

  @OnEvent('send-user.auto-create')
  async sendUserAutoCreate(payload: { email: string; password: string, frontendHost: string, lang?: string }) {
    const { email, password, frontendHost, lang } = payload;
    await this.notificationEventService.sendUserAutoCreate(email, password, frontendHost, lang);
  }

  @OnEvent('send-booking.cancelled')
  async sendBookingCancelled(payload: {
    booking: BookingModel;
    userEmail: string;
    lang: string;
  }) {
    const { booking, userEmail, lang } = payload;
    try {
      await this.notificationEventService.sendBookingCancelled(
        booking,
        userEmail,
        lang,
      );
    } catch (error) {
      console.error('Error sending booking cancellation emails:', error);
    }
  }

  @OnEvent('send-booking.confirmed')
  async sendBookingConfirmed(payload: {
    booking: BookingModel;
    userEmail: string;
    lang: string;
  }) {
    const { booking, userEmail, lang } = payload;
    try {
      await this.notificationEventService.sendBookingConfirmed(
        booking,
        userEmail,
        lang,
      );
    } catch (error) {
      console.error('Error sending booking confirmation emails:', error);
    }
  }

  @OnEvent('send-contract.created')
  async contractCreate(payload: {
    contract: ContractModel;
    userEmail: string;
    lang: string;
  }) {
    const { contract, userEmail, lang } = payload;
    try {
      // NOTA: No enviamos email aquí porque ya se envió cuando se creó el booking
      // Este evento se mantiene para posibles notificaciones futuras específicas de contratos
      console.log(`[NotificationEventController] Evento send-contract.created recibido para contrato. Email ya enviado en booking.created`);
      
      // Si en el futuro necesitamos enviar un email específico de contrato (diferente al de booking),
      // podemos implementarlo aquí
    } catch (error) {
      console.error('Error handling contract creation event:', error);
    }
  }
}