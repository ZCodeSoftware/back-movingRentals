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
  ) {
    // Log inicial de configuración
    this.logEnvironmentConfig();
  }

  private logEnvironmentConfig() {
    this.logger.log('=== CONFIGURACIÓN DE ENTORNO ===');

    // Variables de entorno comunes para email providers
    const emailEnvVars = [
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_USER',
      'SMTP_FROM',
      'SENDGRID_API_KEY',
      'AWS_SES_ACCESS_KEY_ID',
      'AWS_SES_SECRET_ACCESS_KEY',
      'AWS_SES_REGION',
      'MAILGUN_API_KEY',
      'MAILGUN_DOMAIN',
      'RESEND_API_KEY',
      'NODEMAILER_HOST',
      'NODEMAILER_PORT',
      'NODEMAILER_USER',
      'EMAIL_SERVICE',
      'EMAIL_PROVIDER',
    ];

    emailEnvVars.forEach((envVar) => {
      const value = process.env[envVar];
      if (value) {
        // Ocultar valores sensibles
        const maskedValue =
          envVar.includes('KEY') ||
          envVar.includes('SECRET') ||
          envVar.includes('PASSWORD')
            ? `${value.substring(0, 4)}***${value.substring(value.length - 4)}`
            : value;
        this.logger.log(`${envVar}: ${maskedValue}`);
      } else {
        this.logger.warn(`${envVar}: NO CONFIGURADA`);
      }
    });

    // Información del sistema
    this.logger.log(`NODE_ENV: ${process.env.NODE_ENV || 'NO CONFIGURADO'}`);
    this.logger.log(`Platform: ${process.platform}`);
    this.logger.log(`Node Version: ${process.version}`);
    this.logger.log('=== FIN CONFIGURACIÓN ===');
  }

  async reservationUserEmail(email: string, name: string): Promise<any> {
    this.logger.log(`Iniciando reservationUserEmail para: ${email}`);
    try {
      const result = await this.userEmailAdapter.reservationUserEmail(
        email,
        name,
      );
      this.logger.log(`reservationUserEmail exitoso para: ${email}`);
      return result;
    } catch (error) {
      this.logger.error(`Error en reservationUserEmail para ${email}:`, error);
      throw new BadRequestException(error.message);
    }
  }

  async reservationAdminEmail(email: string, adminName: string): Promise<any> {
    this.logger.log(`Iniciando reservationAdminEmail para admin: ${adminName}`);
    try {
      const result = await this.adminEmailAdapter.reservationAdminEmail(
        email,
        adminName,
      );
      this.logger.log(`reservationAdminEmail exitoso para admin: ${adminName}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Error en reservationAdminEmail para admin ${adminName}:`,
        error,
      );
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
    this.logger.log(
      `[Reserva #${bookingIdForLogs}] Email usuario: ${userEmail}, Idioma: ${lang}`,
    );

    // Log de datos de la reserva (sin datos sensibles)
    try {
      const bookingData =
        typeof booking.toJSON === 'function' ? booking.toJSON() : booking;
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Datos booking disponibles: ${Object.keys(bookingData).join(', ')}`,
      );
    } catch (e) {
      this.logger.warn(
        `[Reserva #${bookingIdForLogs}] No se pudieron extraer keys del booking`,
      );
    }

    // Verificar conectividad antes de enviar
    this.logger.log(
      `[Reserva #${bookingIdForLogs}] Verificando conectividad de red...`,
    );
    await this.checkNetworkConnectivity();

    try {
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Intentando enviar correo al USUARIO....`,
      );
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Timestamp inicio envío usuario: ${new Date().toISOString()}`,
      );

      const userResult = await Promise.race([
        this.userEmailAdapter.sendUserBookingCreated(booking, userEmail, lang),
        this.createTimeoutPromise(120000, 'Usuario email timeout'), // 2 minutos
      ]);

      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Timestamp fin envío usuario: ${new Date().toISOString()}`,
      );
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Correo al USUARIO enviado con éxito.`,
      );
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Resultado usuario: ${JSON.stringify(userResult)}`,
      );
    } catch (userError) {
      this.logger.error(
        `[Reserva #${bookingIdForLogs}] [CRITICAL] Fallo al enviar email al USUARIO.`,
      );
      this.logger.error(
        `[Reserva #${bookingIdForLogs}] Error type: ${userError.constructor.name}`,
      );
      this.logger.error(
        `[Reserva #${bookingIdForLogs}] Error message: ${userError.message}`,
      );
      this.logger.error(
        `[Reserva #${bookingIdForLogs}] Stack: ${userError.stack}`,
      );

      // Log detallado del error
      if (userError.code)
        this.logger.error(
          `[Reserva #${bookingIdForLogs}] Error code: ${userError.code}`,
        );
      if (userError.response) {
        this.logger.error(
          `[Reserva #${bookingIdForLogs}] Error response: ${JSON.stringify(userError.response)}`,
        );
      }

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
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Timestamp inicio envío admin: ${new Date().toISOString()}`,
      );

      const adminResult = await Promise.race([
        this.adminEmailAdapter.sendAdminBookingCreated(booking),
        this.createTimeoutPromise(60000, 'Admin email timeout'), // 1 minuto
      ]);

      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Timestamp fin envío admin: ${new Date().toISOString()}`,
      );
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Correo al ADMIN enviado con éxito.`,
      );
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Resultado admin: ${JSON.stringify(adminResult)}`,
      );
    } catch (adminError) {
      this.logger.error(
        `[Reserva #${bookingIdForLogs}] [NON-CRITICAL] Fallo al enviar email al ADMIN.`,
      );
      this.logger.error(
        `[Reserva #${bookingIdForLogs}] Admin error type: ${adminError.constructor.name}`,
      );
      this.logger.error(
        `[Reserva #${bookingIdForLogs}] Admin error message: ${adminError.message}`,
      );
      this.logger.error(
        `[Reserva #${bookingIdForLogs}] Stack: ${adminError.stack}`,
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
    this.logger.log(`Iniciando forgot password para: ${email}`);
    this.logger.log(`Frontend host: ${frontendHost}`);
    try {
      const result = await this.userEmailAdapter.sendUserForgotPassword(
        email,
        token,
        frontendHost,
      );
      this.logger.log(`Forgot password exitoso para: ${email}`);
      return result;
    } catch (error) {
      this.logger.error(`Error en forgot password para ${email}:`, error);
      throw new BadRequestException(error.message);
    }
  }

  async sendUserAutoCreate(
    email: string,
    password: string,
    frontendHost: string,
    lang: string = 'es',
  ): Promise<any> {
    this.logger.log(`Iniciando auto create para: ${email}, lang: ${lang}`);
    this.logger.log(`Frontend host: ${frontendHost}`);
    try {
      const result = await this.userEmailAdapter.sendUserAutoCreate(
        email,
        password,
        frontendHost,
        lang,
      );
      this.logger.log(`Auto create exitoso para: ${email}`);
      return result;
    } catch (error) {
      this.logger.error(`Error en auto create para ${email}:`, error);
      throw new BadRequestException(error.message);
    }
  }

  async sendBookingCancelled(
    booking: BookingModel,
    userEmail: string,
    lang: string = 'es',
  ): Promise<any> {
    const bookingIdForLogs =
      booking.toJSON().bookingNumber || booking.toJSON()._id || 'UNKNOWN';

    this.logger.log(
      `[Reserva #${bookingIdForLogs}] Proceso de notificación de cancelación iniciado.`,
    );
    this.logger.log(
      `[Reserva #${bookingIdForLogs}] Email usuario: ${userEmail}, Idioma: ${lang}`,
    );

    try {
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Intentando enviar correo de cancelación al USUARIO...`,
      );
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Timestamp inicio cancelación usuario: ${new Date().toISOString()}`,
      );

      const userResult = await this.userEmailAdapter.sendUserBookingCancelled(
        booking,
        userEmail,
        lang,
      );

      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Timestamp fin cancelación usuario: ${new Date().toISOString()}`,
      );
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Email de cancelación enviado exitosamente al USUARIO: ${userEmail}`,
      );
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Resultado cancelación usuario: ${JSON.stringify(userResult)}`,
      );
    } catch (userError) {
      this.logger.error(
        `[Reserva #${bookingIdForLogs}] [CRITICAL] Fallo al enviar email de cancelación al USUARIO.`,
      );
      this.logger.error(
        `[Reserva #${bookingIdForLogs}] Error: ${userError.message}`,
      );
      this.logger.error(
        `[Reserva #${bookingIdForLogs}] Stack: ${userError.stack}`,
      );
      throw new BadRequestException(userError.message);
    }

    try {
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Intentando enviar correo de cancelación al ADMIN...`,
      );
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Timestamp inicio cancelación admin: ${new Date().toISOString()}`,
      );

      const adminResult =
        await this.adminEmailAdapter.sendAdminBookingCancelled(booking);

      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Timestamp fin cancelación admin: ${new Date().toISOString()}`,
      );
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Email de cancelación enviado exitosamente al ADMIN`,
      );
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Resultado cancelación admin: ${JSON.stringify(adminResult)}`,
      );
    } catch (adminError) {
      this.logger.error(
        `[Reserva #${bookingIdForLogs}] [NON-CRITICAL] Fallo al enviar email de cancelación al ADMIN.`,
      );
      this.logger.error(
        `[Reserva #${bookingIdForLogs}] Admin error: ${adminError.message}`,
      );
      this.logger.error(
        `[Reserva #${bookingIdForLogs}] Stack: ${adminError.stack}`,
      );
    }

    this.logger.log(
      `[Reserva #${bookingIdForLogs}] Proceso de notificación de cancelación finalizado.`,
    );
  }

  private createTimeoutPromise(ms: number, message: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout after ${ms}ms: ${message}`));
      }, ms);
    });
  }

  private async checkNetworkConnectivity(): Promise<void> {
    try {
      const dns = require('dns');
      const { promisify } = require('util');
      const lookup = promisify(dns.lookup);

      // Test conectividad a servicios comunes de email
      const testHosts = [
        'smtp.gmail.com',
        'api.sendgrid.com',
        'api.mailgun.net',
        'smtp.resend.com',
      ];

      for (const host of testHosts) {
        try {
          await lookup(host);
          this.logger.log(`Conectividad OK para: ${host}`);
          return; // Si al menos uno funciona, consideramos que hay conectividad
        } catch (e) {
          this.logger.warn(`Sin conectividad para: ${host}`);
        }
      }

      this.logger.error(
        'No hay conectividad a ningún proveedor de email común',
      );
    } catch (error) {
      this.logger.error('Error al verificar conectividad:', error.message);
    }
  }
}
