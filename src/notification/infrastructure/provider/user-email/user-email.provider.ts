import { InternalServerErrorException, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { BookingModel } from '../../../../booking/domain/models/booking.model';
import config from '../../../../config';
import { IUserEmailAdapter } from '../../../domain/adapter/user-email.interface.adapter';
import { ContactUserDto } from '../../nest/dto/notifications.dto';
import { forgotPasswordTemplate } from '../forgot-password/forgot-password.template';
import { userAutoCreateTemplateEn } from './auto-create.template-en';
import { userAutoCreateTemplateEs } from './auto-create.template-es';
import { generateUserBookingCancellationEn } from './user-booking-cancelled-en.template';
import { generateUserBookingCancellation } from './user-booking-cancelled.template';
import { generateUserBookingConfirmationEn } from './user-booking-content-en.template';
import { generateUserBookingConfirmation } from './user-booking-content.template';

export class UserEmailProvider implements IUserEmailAdapter {
  private readonly transporter: nodemailer.Transporter;
  private readonly logger = new Logger(UserEmailProvider.name);
  private readonly maxRetries = 3;
  private readonly baseRetryDelay = 2000; // 2 segundos

  constructor() {
    try {
      this.logEmailConfiguration();
      this.transporter = this.createTransporter();
      this.verifyTransporter();
    } catch (error) {
      this.logger.error('Error al inicializar UserEmailProvider:', error);
      throw error;
    }
  }

  private logEmailConfiguration(): void {
    this.logger.log('=== CONFIGURACIÓN EMAIL PROVIDER ===');

    const emailConfig = config().providerEmail?.nodemailer;
    const businessConfig = config().business;

    if (!emailConfig) {
      this.logger.error('⚠️ CONFIGURACIÓN NODEMAILER NO ENCONTRADA');
      return;
    }

    this.logger.log(
      `Gmail User: ${emailConfig.auth?.user || 'NO CONFIGURADO'}`,
    );
    this.logger.log(
      `Gmail Pass: ${emailConfig.auth?.pass ? '***configurado***' : 'NO CONFIGURADO'}`,
    );
    this.logger.log(
      `Business Email: ${businessConfig?.contact_email || 'NO CONFIGURADO'}`,
    );

    // Verificar si es App Password vs password normal
    if (emailConfig.auth?.pass && emailConfig.auth.pass.length === 16) {
      this.logger.log('✅ Parece ser App Password de Gmail (16 caracteres)');
    } else if (emailConfig.auth?.pass) {
      this.logger.warn(
        '⚠️ La password no parece ser App Password de Gmail. Debería tener 16 caracteres.',
      );
    }

    this.logger.log('=== FIN CONFIGURACIÓN EMAIL ===');
  }

  private createTransporter(): nodemailer.Transporter {
    const emailConfig = config().providerEmail?.nodemailer;

    if (!emailConfig?.auth?.user || !emailConfig?.auth?.pass) {
      throw new Error(
        'Configuración de email incompleta. Faltan user/pass en config.providerEmail.nodemailer.auth',
      );
    }

    const transporterConfig = {
      service: 'gmail',
      auth: {
        user: emailConfig.auth.user,
        pass: emailConfig.auth.pass,
      },
      // Configuraciones de timeout y retry
      pool: true,
      maxConnections: 5,
      maxMessages: 10,
      rateDelta: 1000,
      rateLimit: 5,
      // Timeouts
      connectionTimeout: 60000, // 60 segundos para conectar
      greetingTimeout: 30000, // 30 segundos para greeting
      socketTimeout: 60000, // 60 segundos para operaciones socket
      // Configuración TLS
      secure: false, // true for 465, false for other ports
      requireTLS: true,
      tls: {
        rejectUnauthorized: false, // Solo para testing, en prod debería ser true
      },
      // Debug
      debug: process.env.NODE_ENV !== 'production',
      logger: process.env.NODE_ENV !== 'production',
    };

    this.logger.log(
      `Creando transporter con configuración: ${JSON.stringify({
        service: transporterConfig.service,
        user: transporterConfig.auth.user,
        hasPassword: !!transporterConfig.auth.pass,
        connectionTimeout: transporterConfig.connectionTimeout,
        socketTimeout: transporterConfig.socketTimeout,
      })}`,
    );

    return nodemailer.createTransport(transporterConfig);
  }

  private async verifyTransporter(): Promise<void> {
    try {
      this.logger.log('Verificando conexión SMTP...');
      const isReady = await this.transporter.verify();
      if (isReady) {
        this.logger.log('✅ Conexión SMTP verificada exitosamente');
      }
    } catch (error) {
      this.logger.error('❌ Error al verificar conexión SMTP:', error);
      this.logger.error('Código de error:', error.code);
      this.logger.error('Comando que falló:', error.command);

      if (error.code === 'EAUTH') {
        this.logger.error('🔑 ERROR DE AUTENTICACIÓN - Verifica:');
        this.logger.error(
          '1. Que tengas habilitada la verificación en 2 pasos en Gmail',
        );
        this.logger.error(
          '2. Que uses App Password en lugar de tu contraseña normal',
        );
        this.logger.error(
          '3. Que el App Password tenga exactamente 16 caracteres',
        );
      }

      if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
        this.logger.error('🌐 ERROR DE CONEXIÓN - Verifica:');
        this.logger.error('1. Tu conexión a internet');
        this.logger.error('2. Que no haya firewall bloqueando puerto 587/465');
        this.logger.error('3. Configuración de proxy si aplica');
      }

      // No lanzamos error aquí para que la app pueda arrancar
      // pero los logs serán útiles para diagnóstico
    }
  }

  private async sendMailWithRetry(
    mailOptions: any,
    context: string = 'email',
  ): Promise<any> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.logger.log(
          `[${context}] Intento ${attempt}/${this.maxRetries} - Enviando email...`,
        );

        // Crear timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(
              new Error(`Timeout después de 90 segundos en intento ${attempt}`),
            );
          }, 90000); // 90 segundos
        });

        // Race entre el envío y el timeout
        const result = await Promise.race([
          this.transporter.sendMail(mailOptions),
          timeoutPromise,
        ]);

        this.logger.log(
          `[${context}] ✅ Email enviado exitosamente en intento ${attempt}`,
        );
        this.logger.log(`[${context}] Message ID: ${result.messageId}`);
        this.logger.log(`[${context}] Response: ${result.response}`);

        return result;
      } catch (error) {
        lastError = error;
        this.logger.error(
          `[${context}] ❌ Error en intento ${attempt}/${this.maxRetries}:`,
        );
        this.logger.error(`[${context}] Error type: ${error.constructor.name}`);
        this.logger.error(`[${context}] Error message: ${error.message}`);
        this.logger.error(`[${context}] Error code: ${error.code || 'N/A'}`);

        if (error.code === 'EAUTH') {
          this.logger.error(
            `[${context}] 🔑 Error de autenticación - no reintentar`,
          );
          break; // No reintentes errores de autenticación
        }

        if (attempt < this.maxRetries) {
          const delay = this.baseRetryDelay * Math.pow(2, attempt - 1); // Exponential backoff
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
      `Connection timeout - ${lastError.message}`,
    );
  }

  async reservationUserEmail(email: string, name: string): Promise<any> {
    this.logger.log(`Iniciando reservationUserEmail para: ${email}`);

    try {
      const message = {
        from: `"MoovAdventures" <${config().business.contact_email}>`,
        to: email,
        subject: 'Reservation',
        text: `Hello ${name}, your reservation has been confirmed.`,
      };

      return await this.sendMailWithRetry(message, `reservation-${email}`);
    } catch (error) {
      this.logger.error(`Error en reservationUserEmail para ${email}:`, error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async sendContactUserEmail(data: ContactUserDto): Promise<any> {
    this.logger.log(`Iniciando sendContactUserEmail desde: ${data.email}`);

    try {
      const { email, name, subject, text, phone } = data;

      const message = {
        from: `"Moving" <${config().providerEmail.nodemailer.auth.user}>`,
        replyTo: email,
        to: config().business.contact_email,
        subject: subject,
        text: `Soy ${name},\n\n Numero de teléforno: ${phone}\n\n${text}`,
      };

      return await this.sendMailWithRetry(message, `contact-${email}`);
    } catch (error) {
      this.logger.error(`Error en sendContactUserEmail:`, error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async sendUserBookingCreated(
    booking: BookingModel,
    userEmail: string,
    lang: string = 'es',
  ): Promise<any> {
    const bookingId =
      (booking as any).bookingNumber || (booking as any).id || 'unknown';
    const context = `booking-created-${bookingId}`;

    this.logger.log(
      `[${context}] Iniciando sendUserBookingCreated para: ${userEmail}, lang: ${lang}`,
    );

    try {
      let emailContent: { subject: string; html: string };

      this.logger.log(
        `[${context}] Generando contenido del email en idioma: ${lang}`,
      );
      emailContent =
        lang === 'es'
          ? generateUserBookingConfirmation(booking)
          : generateUserBookingConfirmationEn(booking);

      this.logger.log(`[${context}] Subject generado: ${emailContent.subject}`);
      this.logger.log(
        `[${context}] HTML length: ${emailContent.html?.length || 0} caracteres`,
      );

      const message = {
        from: `"MoovAdventures" <${config().business.contact_email}>`,
        to: userEmail,
        subject: emailContent.subject,
        html: emailContent.html,
      };

      this.logger.log(
        `[${context}] Configuración mensaje: From=${message.from}, To=${message.to}, Subject=${message.subject}`,
      );

      return await this.sendMailWithRetry(message, context);
    } catch (error) {
      this.logger.error(`[${context}] Error en sendUserBookingCreated:`, error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async sendUserForgotPassword(
    email: string,
    token: string,
    frontendHost: string,
  ): Promise<any> {
    this.logger.log(`Iniciando sendUserForgotPassword para: ${email}`);

    try {
      const message = {
        from: `"MoovAdventures" <${config().business.contact_email}>`,
        to: email,
        subject: 'Recuperar contraseña',
        html: forgotPasswordTemplate(token, frontendHost),
      };

      return await this.sendMailWithRetry(message, `forgot-password-${email}`);
    } catch (error) {
      this.logger.error(
        `Error en sendUserForgotPassword para ${email}:`,
        error,
      );
      throw new InternalServerErrorException(error.message);
    }
  }

  async sendUserAutoCreate(
    email: string,
    password: string,
    frontendHost: string,
    lang?: string,
  ): Promise<any> {
    this.logger.log(
      `Iniciando sendUserAutoCreate para: ${email}, lang: ${lang}`,
    );

    try {
      const template =
        lang === 'es' ? userAutoCreateTemplateEs : userAutoCreateTemplateEn;
      const message = {
        from: `"MoovAdventures" <${config().business.contact_email}>`,
        to: email,
        subject: 'Cuenta creada',
        html: template(email, password, frontendHost),
      };

      return await this.sendMailWithRetry(message, `auto-create-${email}`);
    } catch (error) {
      this.logger.error(`Error en sendUserAutoCreate para ${email}:`, error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async sendUserBookingCancelled(
    booking: BookingModel,
    userEmail: string,
    lang: string = 'es',
  ): Promise<any> {
    const bookingId =
      booking.toJSON().bookingNumber || booking.toJSON()._id || 'unknown';
    const context = `booking-cancelled-${bookingId}`;

    this.logger.log(
      `[${context}] Iniciando sendUserBookingCancelled para: ${userEmail}, lang: ${lang}`,
    );

    try {
      let emailContent: { subject: string; html: string };
      emailContent =
        lang === 'es'
          ? generateUserBookingCancellation(booking)
          : generateUserBookingCancellationEn(booking);

      const message = {
        from: `"MoovAdventures" <${config().business.contact_email}>`,
        to: userEmail,
        subject: emailContent.subject,
        html: emailContent.html,
      };

      return await this.sendMailWithRetry(message, context);
    } catch (error) {
      this.logger.error(
        `[${context}] Error en sendUserBookingCancelled:`,
        error,
      );
      throw new InternalServerErrorException(error.message);
    }
  }
}
