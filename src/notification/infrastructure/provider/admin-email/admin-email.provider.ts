import { InternalServerErrorException, Logger } from '@nestjs/common';
import { BookingModel } from '../../../../booking/domain/models/booking.model';
import config from '../../../../config';
import { IAdminEmailAdapter } from '../../../../notification/domain/adapter/admin-email.interface.adapter';
import { generateAdminBookingCancellation } from './admin-booking-cancelled.template';
import { generateAdminBookingNotification } from './admin-booking-content.template';
import { lowStockReportTemplate } from './low-stock-report.template';

export class AdminEmailProvider implements IAdminEmailAdapter {
  private readonly logger = new Logger(AdminEmailProvider.name);
  private readonly maxRetries = 3;
  private readonly baseRetryDelay = 1000; // 1 segundo
  private readonly timeout = 30000; // 30 segundos
  private readonly brevoApiKey: string;
  private readonly brevoApiUrl = 'https://api.brevo.com/v3/smtp/email';

  constructor() {
    this.brevoApiKey = this.initializeBrevo();
  }

  private initializeBrevo(): string {
    // this.logger.log('=== CONFIGURACIÓN BREVO ADMIN ===');

    const apiKey =
      config().providerEmail?.brevo?.apiKey || process.env.BREVO_API_KEY;

    if (!apiKey) {
      this.logger.error(
        '❌ BREVO_API_KEY no configurada para AdminEmailProvider',
      );
      throw new Error('Brevo API Key requerida para AdminEmailProvider');
    }

    // this.logger.log(`✅ Brevo Admin inicializado correctamente`);
    // this.logger.log(`API Key: ${apiKey.substring(0, 12)}...`);
    // this.logger.log('=== FIN CONFIGURACIÓN BREVO ADMIN ===');

    return apiKey;
  }

  private async sendEmailWithBrevo(
    emailData: any,
    context: string,
  ): Promise<any> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // this.logger.log(
        //   `[${context}] 📧 Intento ${attempt}/${this.maxRetries} - Enviando admin email con Brevo...`,
        // );
        // this.logger.log(
        //   `[${context}] From: ${emailData.sender.email}, To: ${emailData.to[0].email}, Subject: ${emailData.subject}`,
        // );

        const startTime = Date.now();

        const response = await fetch(this.brevoApiUrl, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'api-key': this.brevoApiKey,
          },
          body: JSON.stringify(emailData),
          signal: AbortSignal.timeout(this.timeout),
        });

        const endTime = Date.now();
        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(
            `Brevo API Error: ${response.status} - ${JSON.stringify(responseData)}`,
          );
        }

        // this.logger.log(
        //   `[${context}] ✅ Admin email enviado exitosamente en ${endTime - startTime}ms`,
        // );
        // this.logger.log(
        //   `[${context}] Message ID: ${responseData.messageId || 'N/A'}`,
        // );

        return responseData;
      } catch (error) {
        lastError = error;

        this.logger.error(
          `[${context}] ❌ Error en intento ${attempt}/${this.maxRetries}:`,
        );
        this.logger.error(`[${context}] Error type: ${error.constructor.name}`);
        this.logger.error(`[${context}] Error message: ${error.message}`);

        // Log específicos de Brevo
        if (error.name === 'AbortError') {
          this.logger.error(
            `[${context}] ⏰ Timeout después de ${this.timeout}ms`,
          );
        }

        if (error.message.includes('401')) {
          this.logger.error(
            `[${context}] 🔑 Error de autenticación - verificar API Key`,
          );
          break; // No reintentar errores de auth
        }

        if (error.message.includes('400')) {
          this.logger.error(
            `[${context}] 📝 Error de datos - verificar formato email`,
          );
          break; // No reintentar errores de formato
        }

        if (attempt < this.maxRetries) {
          const delay = this.baseRetryDelay * Math.pow(2, attempt - 1);
          this.logger.log(
            `[${context}] ⏳ Esperando ${delay}ms antes del siguiente intento...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    this.logger.error(
      `[${context}] ❌ Todos los intentos fallaron. Último error:`,
      lastError,
    );
    throw new InternalServerErrorException(
      `Brevo admin error: ${lastError.message}`,
    );
  }

  private createBrevoEmailData(
    from: { email: string; name: string },
    to: string,
    subject: string,
    htmlContent: string,
    textContent?: string,
  ): any {
    return {
      sender: from,
      to: [{ email: to }],
      subject: subject,
      htmlContent: htmlContent,
      textContent: textContent || this.htmlToText(htmlContent),
      tags: ['moovadventures-admin'], // Para tracking de emails de admin
    };
  }

  private htmlToText(html: string): string {
    // Conversión simple de HTML a texto
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  async reservationAdminEmail(email: string, adminName: string): Promise<any> {
    const context = `admin-reservation-${adminName}`;
    this.logger.log(
      `[${context}] Iniciando reservationAdminEmail para: ${adminName}`,
    );

    try {
      const htmlContent = lowStockReportTemplate(adminName);

      const emailData = this.createBrevoEmailData(
        {
          email: config().business.contact_email,
          name: 'MoovAdventures System',
        },
        config().business.contact_email, // Email del admin/negocio
        'Reporte de Stock Bajo',
        htmlContent,
      );

      // Agregar tags específicos para reportes
      emailData.tags = ['admin-notification', 'low-stock-report'];

      return await this.sendEmailWithBrevo(emailData, context);
    } catch (error) {
      this.logger.error(`[${context}] Error en reservationAdminEmail:`, error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async sendAdminBookingCreated(booking: BookingModel, userData?: any): Promise<any> {
    const bookingId =
      (booking as any).bookingNumber || (booking as any).id || 'unknown';
    const context = `admin-booking-created-${bookingId}`;

    this.logger.log(
      `[${context}] Iniciando sendAdminBookingCreated para reserva: ${bookingId}`,
    );

    try {
      const { subject, html } = generateAdminBookingNotification(booking, userData);

      this.logger.log(`[${context}] Subject generado: ${subject}`);
      this.logger.log(
        `[${context}] HTML length: ${html?.length || 0} caracteres`,
      );

      const emailData = this.createBrevoEmailData(
        {
          email: config().business.contact_email,
          name: 'MoovAdventures System',
        },
        config().business.contact_email,
        subject,
        html,
      );

      // Tags específicos para notificaciones de reservas
      emailData.tags = [
        'admin-notification',
        'booking-created',
        `booking-${bookingId}`,
      ];

      return await this.sendEmailWithBrevo(emailData, context);
    } catch (error) {
      this.logger.error(
        `[${context}] Error en sendAdminBookingCreated:`,
        error,
      );
      console.error(
        'Error al enviar el correo de notificación al admin:',
        error,
      );
      throw new InternalServerErrorException(error.message);
    }
  }

  async sendAdminBookingCancelled(booking: BookingModel): Promise<any> {
    const bookingData = booking.toJSON();
    const bookingId = bookingData.bookingNumber || bookingData._id || 'unknown';
    const context = `admin-booking-cancelled-${bookingId}`;

    this.logger.log(
      `[${context}] Iniciando sendAdminBookingCancelled para reserva: ${bookingId}`,
    );

    try {
      const html = generateAdminBookingCancellation(booking);
      const bookingNumber = bookingData.bookingNumber || 'N/A';
      const subject = `🚨 Reserva Cancelada - #${bookingNumber}`;

      this.logger.log(`[${context}] Subject: ${subject}`);
      this.logger.log(
        `[${context}] HTML length: ${html?.length || 0} caracteres`,
      );

      const emailData = this.createBrevoEmailData(
        {
          email: config().business.contact_email,
          name: 'MoovAdventures System',
        },
        config().business.contact_email,
        subject,
        html,
      );

      // Tags específicos para cancelaciones
      emailData.tags = [
        'admin-notification',
        'booking-cancelled',
        `booking-${bookingId}`,
      ];

      return await this.sendEmailWithBrevo(emailData, context);
    } catch (error) {
      this.logger.error(
        `[${context}] Error en sendAdminBookingCancelled:`,
        error,
      );
      console.error(
        'Error al enviar el correo de cancelación al admin:',
        error,
      );
      throw new InternalServerErrorException(error.message);
    }
  }

  // Método adicional para enviar reportes personalizados al admin
  async sendCustomAdminReport(
    subject: string,
    htmlContent: string,
    tags: string[] = [],
  ): Promise<any> {
    const context = `admin-custom-report`;
    this.logger.log(`[${context}] Enviando reporte personalizado: ${subject}`);

    try {
      const emailData = this.createBrevoEmailData(
        {
          email: config().business.contact_email,
          name: 'MoovAdventures System',
        },
        config().business.contact_email,
        subject,
        htmlContent,
      );

      // Agregar tags personalizados + tags base
      emailData.tags = ['admin-notification', 'custom-report', ...tags];

      return await this.sendEmailWithBrevo(emailData, context);
    } catch (error) {
      this.logger.error(`[${context}] Error en sendCustomAdminReport:`, error);
      throw new InternalServerErrorException(error.message);
    }
  }

  // Método para verificar límites de Brevo (útil para monitoreo)
  async checkBrevoStatus(): Promise<void> {
    try {
      this.logger.log('🔍 Verificando estado de la cuenta Brevo...');

      const response = await fetch('https://api.brevo.com/v3/account', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'api-key': this.brevoApiKey,
        },
      });

      if (response.ok) {
        const accountData = await response.json();
        this.logger.log(
          `📊 Plan actual: ${accountData.plan?.[0]?.type || 'N/A'}`,
        );
        this.logger.log(
          `📧 Emails enviados hoy: ${accountData.statistics?.dailySent || 'N/A'}`,
        );
        this.logger.log(
          `📈 Límite diario: ${accountData.statistics?.dailyLimit || 'N/A'}`,
        );
      } else {
        this.logger.warn(
          '⚠️ No se pudo verificar el estado de la cuenta Brevo',
        );
      }
    } catch (error) {
      this.logger.warn('⚠️ Error al verificar estado de Brevo:', error.message);
    }
  }
}
