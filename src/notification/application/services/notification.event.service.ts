import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { BookingModel } from '../../../booking/domain/models/booking.model';
import { IBookingService } from '../../../booking/domain/services/booking.interface.service';
import SymbolsBooking from '../../../booking/symbols-booking';
import { IAdminEmailAdapter } from '../../../notification/domain/adapter/admin-email.interface.adapter';
import SymbolsNotification from '../../../notification/symbols-notification';
import { IUserEmailAdapter } from '../../domain/adapter/user-email.interface.adapter';
import { INotificationEventService } from '../../domain/services/notificacion.event.interface.service';

@Injectable()
export class NotificationEventService implements INotificationEventService {
  private readonly logger = new Logger(NotificationEventService.name);
  private readonly sentEmails = new Map<string, number>(); // bookingId -> timestamp
  private readonly DEDUP_WINDOW_MS = 60000; // 1 minuto de ventana de deduplicación

  constructor(
    @Inject(SymbolsNotification.IUserEmailAdapter)
    private readonly userEmailAdapter: IUserEmailAdapter,

    @Inject(SymbolsNotification.IAdminEmailAdapter)
    private readonly adminEmailAdapter: IAdminEmailAdapter,

    @Inject(SymbolsBooking.IBookingService)
    private readonly bookingService: IBookingService,
  ) {
    // Limpiar el mapa de emails enviados cada 5 minutos
    setInterval(() => {
      const now = Date.now();
      for (const [key, timestamp] of this.sentEmails.entries()) {
        if (now - timestamp > this.DEDUP_WINDOW_MS) {
          this.sentEmails.delete(key);
        }
      }
    }, 300000); // 5 minutos
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
    const bookingData: any = booking.toJSON ? booking.toJSON() : booking;
    const bookingId = typeof bookingData._id === 'string' ? bookingData._id : String(bookingData._id);
    const bookingIdForLogs = bookingData.bookingNumber || bookingData.id || bookingId;
    const isReserve = bookingData.isReserve || false;
    const bookingStatus = bookingData.status?.name || 'UNKNOWN';
    const paymentMethodName = bookingData.paymentMethod?.name || 'UNKNOWN';

    // LÓGICA ESPECIAL PARA EFECTIVO:
    // Si el método de pago es "Efectivo" Y el status es APPROVED,
    // enviar email de confirmación aunque isReserve sea true
    // (caso de Efectivo con pago del 20% validado desde Web)
    const isEfectivoApproved = 
      paymentMethodName === 'Efectivo' && 
      (bookingStatus === 'APROBADO' || bookingStatus === 'APPROVED');
    
    const effectiveIsReserve = isEfectivoApproved ? false : isReserve;

    this.logger.log(`========================================`);
    this.logger.log(`[Reserva #${bookingIdForLogs}] 🚀 INICIO PROCESO DE NOTIFICACIÓN`);
    this.logger.log(`[Reserva #${bookingIdForLogs}] Email usuario: ${userEmail}`);
    this.logger.log(`[Reserva #${bookingIdForLogs}] Idioma: ${lang}`);
    this.logger.log(`[Reserva #${bookingIdForLogs}] isReserve original: ${isReserve}`);
    this.logger.log(`[Reserva #${bookingIdForLogs}] Status: ${bookingStatus}`);
    this.logger.log(`[Reserva #${bookingIdForLogs}] Método de pago: ${paymentMethodName}`);
    this.logger.log(`[Reserva #${bookingIdForLogs}] Es Efectivo Aprobado: ${isEfectivoApproved}`);
    this.logger.log(`[Reserva #${bookingIdForLogs}] Tipo de email: ${effectiveIsReserve ? 'PENDIENTE (minimalista)' : 'CONFIRMADO (completo)'}`);
    this.logger.log(`========================================`);

    // Verificar si ya se envió un email para esta reserva recientemente
    const dedupKey = `${bookingId}-${lang}`;
    const lastSent = this.sentEmails.get(dedupKey);
    const now = Date.now();
    
    if (lastSent && (now - lastSent) < this.DEDUP_WINDOW_MS) {
      this.logger.warn(
        `[Reserva #${bookingIdForLogs}] ��️ Email duplicado detectado. Ya se envió hace ${Math.round((now - lastSent) / 1000)}s. Ignorando.`,
      );
      return { skipped: true, reason: 'duplicate', lastSent };
    }

    // Registrar este envío
    this.sentEmails.set(dedupKey, now);

    // Log de datos de la reserva (sin datos sensibles)
    try {
      const bookingDataForLog: any =
        typeof booking.toJSON === 'function' ? booking.toJSON() : booking;
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] 📦 Datos booking disponibles: ${Object.keys(bookingDataForLog).join(', ')}`,
      );
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] 💰 Total: ${bookingDataForLog.total}, Pagado: ${bookingDataForLog.totalPaid}`,
      );
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] 📋 Estado: ${bookingDataForLog.status?.name || 'N/A'}`,
      );
    } catch (e) {
      this.logger.warn(
        `[Reserva #${bookingIdForLogs}] ⚠️ No se pudieron extraer keys del booking`,
      );
    }

    // Obtener información del usuario para el email (fuera del try para que esté disponible para ambos emails)
    let userData = null;
    try {
      this.logger.log(`[Reserva #${bookingIdForLogs}] 👤 Obteniendo información del usuario...`);
      const bookingData = booking.toJSON();
      const bookingId = typeof bookingData._id === 'string' ? bookingData._id : String(bookingData._id);
      const user = await this.findUserByBookingId(bookingId);
      if (user) {
        userData = user.toJSON();
        this.logger.log(`[Reserva #${bookingIdForLogs}] ✅ Usuario encontrado: ${userData.name} ${userData.lastName || ''}`);
      } else {
        this.logger.warn(`[Reserva #${bookingIdForLogs}] ⚠️ No se encontró usuario`);
      }
    } catch (error) {
      this.logger.error(`[Reserva #${bookingIdForLogs}] ❌ Error obteniendo usuario: ${error.message}`);
    }

    // Si es Efectivo Aprobado, crear una copia del booking con isReserve = false
    // para que se envíe el email de confirmación en lugar del de pendiente
    const bookingForEmail = isEfectivoApproved 
      ? { ...bookingData, isReserve: false }
      : bookingData;
    
    const bookingModelForEmail = {
      toJSON: () => bookingForEmail
    } as BookingModel;

    try {
      this.logger.log(`========================================`);
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] 📧 ENVIANDO EMAIL AL USUARIO`,
      );
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Destinatario: ${userEmail}`,
      );
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Tipo: ${effectiveIsReserve ? 'PENDIENTE' : 'CONFIRMADO'}`,
      );
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] ⏰ Inicio: ${new Date().toISOString()}`,
      );

      const userResult = await Promise.race([
        this.userEmailAdapter.sendUserBookingCreated(bookingModelForEmail, userEmail, lang, userData),
        this.createTimeoutPromise(120000, 'Usuario email timeout'), // 2 minutos
      ]);

      this.logger.log(
        `[Reserva #${bookingIdForLogs}] ⏰ Fin: ${new Date().toISOString()}`,
      );
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] ✅ EMAIL AL USUARIO ENVIADO EXITOSAMENTE`,
      );
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] 📊 Resultado: ${JSON.stringify(userResult)}`,
      );
      this.logger.log(`========================================`);
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
      this.logger.log(`========================================`);
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] 📧 ENVIANDO EMAIL AL ADMIN`,
      );
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Tipo: ${effectiveIsReserve ? 'PENDIENTE' : 'CONFIRMADO'}`,
      );
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] ⏰ Inicio: ${new Date().toISOString()}`,
      );

      const adminResult = await Promise.race([
        this.adminEmailAdapter.sendAdminBookingCreated(bookingModelForEmail, userData),
        this.createTimeoutPromise(60000, 'Admin email timeout'), // 1 minuto
      ]);

      this.logger.log(
        `[Reserva #${bookingIdForLogs}] ⏰ Fin: ${new Date().toISOString()}`,
      );
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] ✅ EMAIL AL ADMIN ENVIADO EXITOSAMENTE`,
      );
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] 📊 Resultado: ${JSON.stringify(adminResult)}`,
      );
      this.logger.log(`========================================`);
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

    this.logger.log(`========================================`);
    this.logger.log(
      `[Reserva #${bookingIdForLogs}] ✅ PROCESO DE NOTIFICACIÓN FINALIZADO`,
    );
    this.logger.log(`========================================`);
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

  async sendBookingConfirmed(
    booking: BookingModel,
    userEmail: string,
    lang: string = 'es',
  ): Promise<any> {
    const bookingData: any = booking.toJSON ? booking.toJSON() : booking;
    const bookingId = typeof bookingData._id === 'string' ? bookingData._id : String(bookingData._id);
    const bookingIdForLogs = bookingData.bookingNumber || bookingData.id || bookingId;

    this.logger.log(
      `[Reserva #${bookingIdForLogs}] Proceso de notificación de confirmación iniciado (isReserve cambió a false).`,
    );
    this.logger.log(
      `[Reserva #${bookingIdForLogs}] Email usuario: ${userEmail}, Idioma: ${lang}`,
    );

    // Obtener información del usuario para el email
    let userData = null;
    try {
      const user = await this.findUserByBookingId(bookingId);
      if (user) {
        userData = user.toJSON();
      }
    } catch (error) {
      this.logger.warn(`[Reserva #${bookingIdForLogs}] No se pudo obtener información del usuario: ${error.message}`);
    }

    try {
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Intentando enviar correo de confirmación completo al USUARIO...`,
      );
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Timestamp inicio confirmación usuario: ${new Date().toISOString()}`,
      );

      const userResult = await Promise.race([
        this.userEmailAdapter.sendUserBookingCreated(booking, userEmail, lang, userData),
        this.createTimeoutPromise(120000, 'Usuario email timeout'), // 2 minutos
      ]);

      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Timestamp fin confirmación usuario: ${new Date().toISOString()}`,
      );
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Correo de confirmación completo enviado con éxito al USUARIO.`,
      );
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Resultado confirmación usuario: ${JSON.stringify(userResult)}`,
      );
    } catch (userError) {
      this.logger.error(
        `[Reserva #${bookingIdForLogs}] [CRITICAL] Fallo al enviar email de confirmación al USUARIO.`,
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

      console.error(
        'Objeto de error completo (confirmación usuario):',
        JSON.stringify(userError, Object.getOwnPropertyNames(userError)),
      );

      throw new BadRequestException(userError.message);
    }

    try {
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Intentando enviar correo de confirmación completo al ADMIN...`,
      );
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Timestamp inicio confirmación admin: ${new Date().toISOString()}`,
      );

      const adminResult = await Promise.race([
        this.adminEmailAdapter.sendAdminBookingCreated(booking, userData),
        this.createTimeoutPromise(60000, 'Admin email timeout'), // 1 minuto
      ]);

      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Timestamp fin confirmación admin: ${new Date().toISOString()}`,
      );
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Correo de confirmación completo enviado con éxito al ADMIN.`,
      );
      this.logger.log(
        `[Reserva #${bookingIdForLogs}] Resultado confirmación admin: ${JSON.stringify(adminResult)}`,
      );
    } catch (adminError) {
      this.logger.error(
        `[Reserva #${bookingIdForLogs}] [NON-CRITICAL] Fallo al enviar email de confirmación al ADMIN.`,
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
        'Objeto de error completo (confirmación admin):',
        JSON.stringify(adminError, Object.getOwnPropertyNames(adminError)),
      );
    }

    this.logger.log(
      `[Reserva #${bookingIdForLogs}] Proceso de notificación de confirmación finalizado.`,
    );
  }

  private createTimeoutPromise(ms: number, message: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout after ${ms}ms: ${message}`));
      }, ms);
    });
  }

  private async findUserByBookingId(bookingId: string): Promise<any> {
    try {
      return await this.bookingService.findUserByBookingId(bookingId);
    } catch (error) {
      this.logger.warn(`No se pudo encontrar usuario para booking ${bookingId}: ${error.message}`);
      return null;
    }
  }
}
