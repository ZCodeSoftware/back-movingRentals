import { InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { BookingModel } from '../../../../booking/domain/models/booking.model';
import config from '../../../../config';
import { IUserEmailAdapter } from '../../../domain/adapter/user-email.interface.adapter';
import { ContactUserDto } from '../../nest/dto/notifications.dto';
import { forgotPasswordTemplate } from '../forgot-password/forgot-password.template';
import { userAutoCreateTemplateEn } from './auto-create.template-en';
import { userAutoCreateTemplateEs } from './auto-create.template-es';
import { generateUserBookingConfirmationEn } from './user-booking-content-en.template';
import { generateUserBookingConfirmation } from './user-booking-content.template';
import { generateUserBookingCancellation } from './user-booking-cancelled.template';
import { generateUserBookingCancellationEn } from './user-booking-cancelled-en.template';

export class UserEmailProvider implements IUserEmailAdapter {
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config().providerEmail.nodemailer.auth.user,
        pass: config().providerEmail.nodemailer.auth.pass,
      },
    });
  }

  async reservationUserEmail(email: string, name: string): Promise<any> {
    try {
      const message = {
        from: 'your-email@gmail.com',
        to: email,
        subject: 'Reservation',
        text: `Hello ${name}, your reservation has been confirmed.`,
      };

      return await this.transporter.sendMail(message);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async sendContactUserEmail(data: ContactUserDto): Promise<any> {
    try {
      const { email, name, subject, text, phone } = data;

      const message = {
        from: `"Moving" <${config().providerEmail.nodemailer.auth.user}>`,
        replyTo: email,
        to: config().business.contact_email,
        subject: subject,
        text: `Soy ${name},\n\n Numero de teléforno: ${phone}\n\n${text}`,
      };

      return await this.transporter.sendMail(message);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async sendUserBookingCreated(
    booking: BookingModel,
    userEmail: string,
    lang: string = 'es',
  ): Promise<any> {
    try {
      let emailContent: { subject: string; html: string };
      emailContent = lang === 'es' ? generateUserBookingConfirmation(booking) : generateUserBookingConfirmationEn(booking);

      const message = {
        from: `"MoovAdventures" <${config().business.contact_email}>`,
        to: userEmail,
        subject: emailContent.subject,
        html: emailContent.html,
      };

      return await this.transporter.sendMail(message);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async sendUserForgotPassword(email: string, token: string, frontendHost: string): Promise<any> {
    try {

      const message = {
        from: `"MoovAdventures" <${config().business.contact_email}>`,
        to: email,
        subject: 'Recuperar contraseña',
        html: forgotPasswordTemplate(token, frontendHost),
      };
      return await this.transporter.sendMail(message);
    }
    catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async sendUserAutoCreate(email: string, password: string, frontendHost: string, lang?: string): Promise<any> {
    try {
      const template = lang === 'es' ? userAutoCreateTemplateEs : userAutoCreateTemplateEn;
      const message = {
        from: `"MoovAdventures" <${config().business.contact_email}>`,
        to: email,
        subject: 'Cuenta creada',
        html: template(email, password, frontendHost),
      };
      return await this.transporter.sendMail(message);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async sendUserBookingCancelled(
    booking: BookingModel,
    userEmail: string,
    lang: string = 'es',
  ): Promise<any> {
    try {
      let emailContent: { subject: string; html: string };
      emailContent = lang === 'es' ? generateUserBookingCancellation(booking) : generateUserBookingCancellationEn(booking);

      const message = {
        from: `"MoovAdventures" <${config().business.contact_email}>`,
        to: userEmail,
        subject: emailContent.subject,
        html: emailContent.html,
      };

      return await this.transporter.sendMail(message);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}