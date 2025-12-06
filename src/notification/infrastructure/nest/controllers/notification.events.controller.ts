import { Controller, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ApiTags } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BookingModel } from '../../../../booking/domain/models/booking.model';
import { ContractModel } from '../../../../contract/domain/models/contract.model';
import { Contract } from '../../../../core/infrastructure/mongo/schemas/public/contract.schema';
import SymbolsNotification from '../../../../notification/symbols-notification';
import { INotificationEventService } from '../../../domain/services/notificacion.event.interface.service';

@ApiTags('Notification Event')
@Controller('notification-event')
export class NotificationEventController {
  constructor(
    @Inject(SymbolsNotification.INotificationEventService)
    private readonly notificationEventService: INotificationEventService,
    @InjectModel(Contract.name)
    private readonly contractModel: Model<Contract>,
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
      const bookingId = updatedBooking?.toJSON?.()?._id;
      
      // Buscar el contrato asociado al booking para verificar el source
      const contract = await this.contractModel.findOne({ booking: bookingId }).lean();
      
      if (contract) {
        const source = contract.source || 'Web';
        console.log(`[NotificationEventController] Contrato encontrado - source: ${source}`);
        
        // LÓGICA:
        // - Dashboard: SIEMPRE enviar email inmediatamente
        // - Web: Mantener lógica actual (solo enviar cuando se confirma el pago)
        //   El BookingService ya maneja esto, así que para Web simplemente enviamos
        //   el email cuando llegue el evento (que solo se emite en los momentos correctos)
        
        if (source === 'Dashboard') {
          console.log('[NotificationEventController] ✅ Source es Dashboard - Enviando email inmediatamente');
          await this.notificationEventService.sendBookingCreated(
            updatedBooking,
            userEmail,
            lang,
          );
          console.log('[NotificationEventController] ✅ Email enviado exitosamente');
        } else {
          // Source es 'Web' - Enviar email siguiendo la lógica actual
          // (el BookingService ya decidió si debe emitir el evento o no)
          console.log('[NotificationEventController] 📧 Source es Web - Enviando email según lógica de confirmación de pago');
          await this.notificationEventService.sendBookingCreated(
            updatedBooking,
            userEmail,
            lang,
          );
          console.log('[NotificationEventController] ✅ Email enviado exitosamente');
        }
      } else {
        console.log('[NotificationEventController] ⚠️ No se encontró contrato asociado - Enviando email por defecto');
        // Si no hay contrato, enviar el email (comportamiento por defecto)
        await this.notificationEventService.sendBookingCreated(
          updatedBooking,
          userEmail,
          lang,
        );
      }
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
    lang?: string;
  }) {
    const { email, token, frontendHost, lang } = payload;
    await this.notificationEventService.sendUserForgotPassword(email, token, frontendHost, lang);
  }

  @OnEvent('send-user.auto-create')
  async sendUserAutoCreate(payload: { email: string; password: string, frontendHost: string, lang?: string }) {
    const { email, password, frontendHost, lang } = payload;
    await this.notificationEventService.sendUserAutoCreate(email, password, frontendHost, lang);
  }

  @OnEvent('send-user.welcome')
  async sendUserWelcome(payload: { email: string, frontendHost: string, lang?: string }) {
    const { email, frontendHost, lang } = payload;
    await this.notificationEventService.sendUserWelcome(email, frontendHost, lang);
  }

  @OnEvent('send-booking.cancelled')
  async sendBookingCancelled(payload: {
    booking: BookingModel;
    userEmail: string;
    lang: string;
  }) {
    const { booking, userEmail, lang } = payload;
    try {
      const bookingId = booking?.toJSON?.()?._id;
      
      // Buscar el contrato asociado al booking para verificar el source (solo para logging)
      const contract = await this.contractModel.findOne({ booking: bookingId }).lean();
      
      if (contract) {
        const source = contract.source || 'Web';
        console.log(`[NotificationEventController] Contrato encontrado para cancelación - source: ${source}`);
      } else {
        console.log('[NotificationEventController] ⚠️ No se encontró contrato asociado');
      }
      
      // SIEMPRE enviar email de cancelación, sin importar el source
      console.log('[NotificationEventController] ✅ Enviando email de cancelación');
      await this.notificationEventService.sendBookingCancelled(
        booking,
        userEmail,
        lang,
      );
      console.log('[NotificationEventController] ✅ Email de cancelación enviado exitosamente');
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
      const bookingId = booking?.toJSON?.()?._id;
      
      // Buscar el contrato asociado al booking para verificar el source
      const contract = await this.contractModel.findOne({ booking: bookingId }).lean();
      
      if (contract) {
        const source = contract.source || 'Web';
        console.log(`[NotificationEventController] Contrato encontrado para confirmación - source: ${source}`);
      }
      
      // SIEMPRE enviar email cuando se confirma un pago, independientemente del source
      console.log('[NotificationEventController] ✅ Enviando email de confirmación de pago');
      await this.notificationEventService.sendBookingConfirmed(
        booking,
        userEmail,
        lang,
      );
      console.log('[NotificationEventController] ✅ Email de confirmación enviado exitosamente');
    } catch (error) {
      console.error('Error sending booking confirmation emails:', error);
    }
  }

  @OnEvent('send-booking.rejected')
  async sendBookingRejected(payload: {
    booking: BookingModel;
    userEmail: string;
    lang: string;
  }) {
    const { booking, userEmail, lang } = payload;
    try {
      const bookingId = booking?.toJSON?.()?._id;
      
      // Buscar el contrato asociado al booking para verificar el source
      const contract = await this.contractModel.findOne({ booking: bookingId }).lean();
      
      if (contract) {
        const source = contract.source || 'Web';
        console.log(`[NotificationEventController] Contrato encontrado para pago rechazado - source: ${source}`);
      }
      
      // SIEMPRE enviar email cuando un pago es rechazado, independientemente del source
      console.log('[NotificationEventController] ✅ Enviando email de pago rechazado');
      await this.notificationEventService.sendBookingRejected(
        booking,
        userEmail,
        lang,
      );
      console.log('[NotificationEventController] ✅ Email de pago rechazado enviado exitosamente');
    } catch (error) {
      console.error('Error sending booking rejection emails:', error);
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