import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { BookingModel } from '../../../booking/domain/models/booking.model';
import { IAdminEmailAdapter } from '../../../notification/domain/adapter/admin-email.interface.adapter';
import SymbolsNotification from '../../../notification/symbols-notification';
import { IUserEmailAdapter } from '../../domain/adapter/user-email.interface.adapter';
import { INotificationEventService } from '../../domain/services/notificacion.event.interface.service';

@Injectable()
export class NotificationEventService implements INotificationEventService {
  private readonly logger = new Logger(NotificationEventService.name);

  constructor(
    @Inject(SymbolsNotification.IUserEmailAdapter)
    private readonly userEmailAdapter: IUserEmailAdapter,

    @Inject(SymbolsNotification.IAdminEmailAdapter)
    private readonly adminEmailAdapter: IAdminEmailAdapter,
  ) {}

  async reservationUserEmail(email: string, name: string): Promise<any> {
    try {
      return await this.userEmailAdapter.reservationUserEmail(email, name);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async reservationAdminEmail(email: string, adminName: string): Promise<any> {
    try {
      return await this.adminEmailAdapter.reservationAdminEmail(
        email,
        adminName,
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async sendBookingCreated(
    booking: BookingModel,
    userEmail: string,
    lang: string = 'es',
  ): Promise<any> {
    const bookingIdForLogs =
      (booking as any).bookingNumber || (booking as any).id;
    this.logger.log(
      `[Reserva #${bookingIdForLogs}] Proceso de notificación iniciado.`,
    );

    try {
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Intentando enviar correo al USUARIO...`,
      );
      await this.userEmailAdapter.sendUserBookingCreated(
        booking,
        userEmail,
        lang,
      );
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Correo al USUARIO enviado con éxito.`,
      );
    } catch (userError) {
      this.logger.error(
        `[Reserva #${bookingIdForLogs}] [CRITICAL] Fallo al enviar email al USUARIO. Stack: ${userError.stack}`,
      );
      console.error(
        'Objeto de error completo (usuario):',
        JSON.stringify(userError, Object.getOwnPropertyNames(userError)),
      );
      throw new BadRequestException(userError.message);
    }

    try {
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Intentando enviar correo al ADMIN...`,
      );
      await this.adminEmailAdapter.sendAdminBookingCreated(booking);
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Correo al ADMIN enviado con éxito.`,
      );
    } catch (adminError) {
      this.logger.error(
        `[Reserva #${bookingIdForLogs}] [NON-CRITICAL] Fallo al enviar email al ADMIN. Stack: ${adminError.stack}`,
      );
      console.error(
        'Objeto de error completo (admin):',
        JSON.stringify(adminError, Object.getOwnPropertyNames(adminError)),
      );
    }

    this.logger.log(
      `[Reserva #${bookingIdForLogs}] Proceso de notificación finalizado.`,
    );
  }

  async sendUserForgotPassword(
    email: string,
    token: string,
    frontendHost: string,
  ): Promise<any> {
    try {
      return await this.userEmailAdapter.sendUserForgotPassword(
        email,
        token,
        frontendHost,
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async sendUserAutoCreate(
    email: string,
    password: string,
    frontendHost: string,
    lang: string = 'es',
  ): Promise<any> {
    try {
      return await this.userEmailAdapter.sendUserAutoCreate(
        email,
        password,
        frontendHost,
        lang,
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async sendBookingCancelled(
    booking: BookingModel,
    userEmail: string,
    lang: string = 'es',
  ): Promise<any> {
    const bookingIdForLogs = booking.toJSON().bookingNumber || booking.toJSON()._id || 'UNKNOWN';
    this.logger.log(
      `[Reserva #${bookingIdForLogs}] Proceso de notificación de cancelación iniciado.`,
    );
    
    try {
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Intentando enviar correo de cancelación al USUARIO...`,
      );
      // Enviar email al usuario
      await this.userEmailAdapter.sendUserBookingCancelled(
        booking,
        userEmail,
        lang,
      );
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Email de cancelación enviado exitosamente al USUARIO: ${userEmail}`,
      );
    } catch (userError) {
      this.logger.error(
        `[Reserva #${bookingIdForLogs}] [CRITICAL] Fallo al enviar email de cancelación al USUARIO. Stack: ${userError.stack}`,
      );
      throw new BadRequestException(userError.message);
    }

    try {
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Intentando enviar correo de cancelación al ADMIN...`,
      );
      // Enviar email al admin
      await this.adminEmailAdapter.sendAdminBookingCancelled(booking);
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Email de cancelación enviado exitosamente al ADMIN`,
      );
    } catch (adminError) {
      this.logger.error(
        `[Reserva #${bookingIdForLogs}] [NON-CRITICAL] Fallo al enviar email de cancelación al ADMIN. Stack: ${adminError.stack}`,
      );
    }

    this.logger.log(
      `[Reserva #${bookingIdForLogs}] Proceso de notificación de cancelación finalizado.`,
    );
  }
}
