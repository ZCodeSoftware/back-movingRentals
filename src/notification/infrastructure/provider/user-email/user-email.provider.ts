import { Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
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
import { generateUserBookingReserve } from './user-booking-reserve.template';
import { generateUserBookingReserveEn } from './user-booking-reserve-en.template';

@Injectable()
export class UserEmailProvider implements IUserEmailAdapter {
  private readonly logger = new Logger(UserEmailProvider.name);
  private readonly maxRetries = 3;
  private readonly baseRetryDelay = 1000; // 1 segundo
  private readonly timeout = 30000; // 30 segundos
  private readonly brevoApiKey: string;
  private readonly brevoApiUrl = 'https://api.brevo.com/v3/smtp/email';

  constructor(
    @InjectConnection() private readonly connection: Connection,
  ) {
    this.brevoApiKey = this.initializeBrevo();
  }

  private initializeBrevo(): string {
    // this.logger.log('=== CONFIGURACIÓN BREVO ===');

    const apiKey =
      config().providerEmail?.brevo?.apiKey || process.env.BREVO_API_KEY;

    if (!apiKey) {
      this.logger.error('❌ BREVO_API_KEY no configurada');
      this.logger.error('Para configurar Brevo:');
      this.logger.error('1. Ve a https://app.brevo.com');
      this.logger.error('2. Crea una cuenta gratuita');
      this.logger.error('3. Ve a SMTP & API -> API Keys');
      this.logger.error('4. Crea una nueva API Key');
      this.logger.error('5. Agrega BREVO_API_KEY=xkeysib-xxx a tu .env');
      throw new Error('Brevo API Key requerida');
    }

    if (!apiKey.startsWith('xkeysib-')) {
      this.logger.warn(
        '⚠️ La API Key no parece ser de Brevo (debería empezar con "xkeysib-")',
      );
    }

    // this.logger.log(`✅ Brevo inicializado correctamente`);
    // this.logger.log(`API Key: ${apiKey.substring(0, 12)}...`);
    // this.logger.log(`Timeout configurado: ${this.timeout}ms`);
    // this.logger.log(`Plan Gratuito: 300 emails/día, 9,000/mes`);
    // this.logger.log('=== FIN CONFIGURACIÓN BREVO ===');

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
        //   `[${context}] 📧 Intento ${attempt}/${this.maxRetries} - Enviando con Brevo...`,
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
        //   `[${context}] ✅ Email enviado exitosamente en ${endTime - startTime}ms`,
        // );
        // this.logger.log(
        //   `[${context}] Message ID: ${responseData.messageId || 'N/A'}`,
        // );
        // this.logger.log(
        //   `[${context}] Response: ${JSON.stringify(responseData)}`,
        // );

        return responseData;
      } catch (error) {
        lastError = error;

        this.logger.error(
          `[${context}] ❌ Error en intento ${attempt}/${this.maxRetries}:`,
        );
        this.logger.error(`[${context}] Error type: ${error.constructor.name}`);
        this.logger.error(`[${context}] Error message: ${error.message}`);

        // Log detalles específicos de Brevo
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

        if (error.message.includes('429')) {
          this.logger.error(
            `[${context}] 🚦 Rate limit alcanzado - verificar límites diarios`,
          );
          // Sí reintentar rate limits con más delay
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
    throw new InternalServerErrorException(`Brevo error: ${lastError.message}`);
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
      tags: ['moovadventures'], // Para tracking
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

  /**
   * Enriquece el cart del booking con los datos completos de la base de datos
   * Maneja tanto el caso donde los items ya están populados como cuando solo son IDs
   */
  private async enrichBookingCart(booking: BookingModel): Promise<BookingModel> {
    const bookingData = booking.toJSON ? booking.toJSON() : (booking as any);
    const bookingNumber = bookingData.bookingNumber || 'N/A';
    
    try {
      const cartString = bookingData.cart;
      if (!cartString || typeof cartString !== 'string') {
        this.logger.warn(`[${bookingNumber}] Cart no es un string válido, retornando booking sin cambios`);
        return booking;
      }

      const cart = JSON.parse(cartString);
      let hasChanges = false;

      // Enriquecer vehículos
      if (cart.vehicles && Array.isArray(cart.vehicles)) {
        for (let i = 0; i < cart.vehicles.length; i++) {
          const vehicleItem = cart.vehicles[i];
          const vehicleRef = vehicleItem.vehicle;
          
          // Si vehicle es solo un string (ID), buscar los datos completos
          if (typeof vehicleRef === 'string') {
            try {
              const Vehicle = this.connection.model('Vehicle');
              const vehicleData = await Vehicle.findById(vehicleRef)
                .populate('category')
                .lean()
                .exec();
              
              if (vehicleData) {
                cart.vehicles[i].vehicle = vehicleData;
                hasChanges = true;
                this.logger.log(`[${bookingNumber}] Vehículo ${vehicleRef} enriquecido`);
              }
            } catch (error) {
              this.logger.error(`[${bookingNumber}] Error enriqueciendo vehículo ${vehicleRef}:`, error.message);
            }
          }
        }
      }

      // Enriquecer transfers
      if (cart.transfer && Array.isArray(cart.transfer)) {
        for (let i = 0; i < cart.transfer.length; i++) {
          const transferItem = cart.transfer[i];
          const transferRef = transferItem.transfer;
          
          // Si transfer es solo un string (ID), buscar los datos completos
          if (typeof transferRef === 'string') {
            try {
              const Transfer = this.connection.model('Transfer');
              const transferData = await Transfer.findById(transferRef)
                .populate('category')
                .lean()
                .exec();
              
              if (transferData) {
                cart.transfer[i].transfer = transferData;
                hasChanges = true;
                this.logger.log(`[${bookingNumber}] Transfer ${transferRef} enriquecido`);
              }
            } catch (error) {
              this.logger.error(`[${bookingNumber}] Error enriqueciendo transfer ${transferRef}:`, error.message);
            }
          }
        }
      }

      // Enriquecer tours
      if (cart.tours && Array.isArray(cart.tours)) {
        for (let i = 0; i < cart.tours.length; i++) {
          const tourItem = cart.tours[i];
          const tourRef = tourItem.tour;
          
          // Si tour es solo un string (ID), buscar los datos completos
          if (typeof tourRef === 'string') {
            try {
              const Tour = this.connection.model('Tour');
              const tourData = await Tour.findById(tourRef)
                .populate('category')
                .lean()
                .exec();
              
              if (tourData) {
                cart.tours[i].tour = tourData;
                hasChanges = true;
                this.logger.log(`[${bookingNumber}] Tour ${tourRef} enriquecido`);
              }
            } catch (error) {
              this.logger.error(`[${bookingNumber}] Error enriqueciendo tour ${tourRef}:`, error.message);
            }
          }
        }
      }

      // Enriquecer tickets
      if (cart.tickets && Array.isArray(cart.tickets)) {
        for (let i = 0; i < cart.tickets.length; i++) {
          const ticketItem = cart.tickets[i];
          const ticketRef = ticketItem.ticket;
          
          // Si ticket es solo un string (ID), buscar los datos completos
          if (typeof ticketRef === 'string') {
            try {
              const Ticket = this.connection.model('Ticket');
              const ticketData = await Ticket.findById(ticketRef)
                .populate('category')
                .lean()
                .exec();
              
              if (ticketData) {
                cart.tickets[i].ticket = ticketData;
                hasChanges = true;
                this.logger.log(`[${bookingNumber}] Ticket ${ticketRef} enriquecido`);
              }
            } catch (error) {
              this.logger.error(`[${bookingNumber}] Error enriqueciendo ticket ${ticketRef}:`, error.message);
            }
          }
        }
      }

      // Enriquecer branch si es necesario
      if (cart.branch && typeof cart.branch === 'string') {
        try {
          const Branch = this.connection.model('Branch');
          const branchData = await Branch.findById(cart.branch).lean().exec();
          
          if (branchData) {
            cart.branch = branchData;
            hasChanges = true;
            this.logger.log(`[${bookingNumber}] Branch ${cart.branch} enriquecido`);
          }
        } catch (error) {
          this.logger.error(`[${bookingNumber}] Error enriqueciendo branch:`, error.message);
        }
      }

      // Si hubo cambios, crear un nuevo booking con el cart enriquecido
      if (hasChanges) {
        const enrichedBookingData = {
          ...bookingData,
          cart: JSON.stringify(cart),
        };
        this.logger.log(`[${bookingNumber}] Cart enriquecido exitosamente`);
        return BookingModel.hydrate(enrichedBookingData);
      }

      return booking;
    } catch (error) {
      this.logger.error(`[${bookingNumber}] Error enriqueciendo cart:`, error);
      // En caso de error, retornar el booking original
      return booking;
    }
  }

  async reservationUserEmail(email: string, name: string): Promise<any> {
    const context = `reservation-${email}`;
    this.logger.log(`[${context}] Iniciando reservationUserEmail`);

    try {
      const htmlContent = `<p>Hello <strong>${name}</strong>,</p><p>Your reservation has been confirmed.</p>`;

      const emailData = this.createBrevoEmailData(
        { email: config().business.contact_email, name: 'MoovAdventures' },
        email,
        'Reservation Confirmation',
        htmlContent,
      );

      return await this.sendEmailWithBrevo(emailData, context);
    } catch (error) {
      this.logger.error(`[${context}] Error en reservationUserEmail:`, error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async sendContactUserEmail(data: ContactUserDto): Promise<any> {
    const context = `contact-${data.email}`;
    this.logger.log(`[${context}] Iniciando sendContactUserEmail`);

    try {
      const { email, name, subject, text, phone } = data;

      const htmlContent = `
        <p><strong>Contacto desde:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Teléfono:</strong> ${phone}</p>
        <p><strong>Mensaje:</strong></p>
        <p>${text.replace(/\n/g, '<br>')}</p>
      `;

      const emailData = this.createBrevoEmailData(
        { email: config().business.contact_email, name: 'Moving' },
        config().business.contact_email,
        subject,
        htmlContent,
      );

      // Agregar reply-to
      emailData.replyTo = { email: email, name: name };

      return await this.sendEmailWithBrevo(emailData, context);
    } catch (error) {
      this.logger.error(`[${context}] Error en sendContactUserEmail:`, error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async sendUserBookingCreated(
    booking: BookingModel,
    userEmail: string,
    lang: string = 'es',
    userData?: any,
  ): Promise<any> {
    const bookingData = booking.toJSON ? booking.toJSON() : (booking as any);
    const bookingId =
      (booking as any).bookingNumber || (booking as any).id || 'unknown';
    const context = `booking-created-${bookingId}`;
    const isReserve = bookingData.isReserve || false;

    this.logger.log(
      `[${context}] Iniciando sendUserBookingCreated para: ${userEmail}, lang: ${lang}, isReserve: ${isReserve}`,
    );

    try {
      // Enriquecer el booking con datos completos de la BD
      this.logger.log(`[${context}] Enriqueciendo cart con datos de la BD...`);
      const enrichedBooking = await this.enrichBookingCart(booking);
      
      let emailContent: { subject: string; html: string };

      this.logger.log(
        `[${context}] Generando contenido del email en idioma: ${lang}`,
      );
      
      // Si es una pre-reserva, usar las plantillas de reserva
      if (isReserve) {
        emailContent =
          lang === 'es'
            ? generateUserBookingReserve(enrichedBooking, userEmail, userData)
            : generateUserBookingReserveEn(enrichedBooking, userEmail, userData);
      } else {
        // Si es una reserva confirmada, usar las plantillas completas
        emailContent =
          lang === 'es'
            ? generateUserBookingConfirmation(enrichedBooking, userEmail, userData)
            : generateUserBookingConfirmationEn(enrichedBooking, userEmail, userData);
      }

      this.logger.log(`[${context}] Subject: ${emailContent.subject}`);
      this.logger.log(
        `[${context}] HTML length: ${emailContent.html?.length || 0} caracteres`,
      );

      const emailData = this.createBrevoEmailData(
        { email: config().business.contact_email, name: 'MoovAdventures' },
        userEmail,
        emailContent.subject,
        emailContent.html,
      );

      // Agregar tags para tracking
      const tags = isReserve 
        ? ['booking-reserve', lang, `booking-${bookingId}`]
        : ['booking-confirmation', lang, `booking-${bookingId}`];
      emailData.tags = tags;

      return await this.sendEmailWithBrevo(emailData, context);
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
    const context = `forgot-password-${email}`;
    this.logger.log(`[${context}] Iniciando sendUserForgotPassword`);

    try {
      const htmlContent = forgotPasswordTemplate(token, frontendHost);

      const emailData = this.createBrevoEmailData(
        { email: config().business.contact_email, name: 'MoovAdventures' },
        email,
        'Recuperar contraseña',
        htmlContent,
      );

      emailData.tags = ['password-recovery'];

      return await this.sendEmailWithBrevo(emailData, context);
    } catch (error) {
      this.logger.error(`[${context}] Error en sendUserForgotPassword:`, error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async sendUserAutoCreate(
    email: string,
    password: string,
    frontendHost: string,
    lang?: string,
  ): Promise<any> {
    const context = `auto-create-${email}`;
    this.logger.log(`[${context}] Iniciando sendUserAutoCreate, lang: ${lang}`);

    try {
      const template =
        lang === 'es' ? userAutoCreateTemplateEs : userAutoCreateTemplateEn;
      const htmlContent = template(email, password, frontendHost);

      const emailData = this.createBrevoEmailData(
        { email: config().business.contact_email, name: 'MoovAdventures' },
        email,
        lang === 'es' ? 'Cuenta creada' : 'Account created',
        htmlContent,
      );

      emailData.tags = ['account-creation', lang || 'es'];

      return await this.sendEmailWithBrevo(emailData, context);
    } catch (error) {
      this.logger.error(`[${context}] Error en sendUserAutoCreate:`, error);
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
      // Enriquecer el booking con datos completos de la BD
      this.logger.log(`[${context}] Enriqueciendo cart con datos de la BD...`);
      const enrichedBooking = await this.enrichBookingCart(booking);
      
      let emailContent: { subject: string; html: string };
      emailContent =
        lang === 'es'
          ? generateUserBookingCancellation(enrichedBooking)
          : generateUserBookingCancellationEn(enrichedBooking);

      const emailData = this.createBrevoEmailData(
        { email: config().business.contact_email, name: 'MoovAdventures' },
        userEmail,
        emailContent.subject,
        emailContent.html,
      );

      emailData.tags = ['booking-cancellation', lang, `booking-${bookingId}`];

      return await this.sendEmailWithBrevo(emailData, context);
    } catch (error) {
      this.logger.error(
        `[${context}] Error en sendUserBookingCancelled:`,
        error,
      );
      throw new InternalServerErrorException(error.message);
    }
  }
}
