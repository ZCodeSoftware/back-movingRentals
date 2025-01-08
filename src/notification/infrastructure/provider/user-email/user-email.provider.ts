import { InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { BookingModel } from '../../../../booking/domain/models/booking.model';
import config from '../../../../config';
import { IUserEmailAdapter } from '../../../domain/adapter/user-email.interface.adapter';
import { ContactUserDto } from '../../nest/dto/notifications.dto';
import { generateUserBookingHtml } from './user-booking-content.template';

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
      const { email, name, subject, text } = data;

      const message = {
        from: `"Moving" <${config().providerEmail.nodemailer.auth.user}>`,
        replyTo: email,
        to: config().business.contact_email,
        subject: subject,
        text: `Soy ${name},\n\n${text}`,
      };

      return await this.transporter.sendMail(message);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async sendUserBookingCreated(
    booking: BookingModel,
    userEmail: string,
  ): Promise<any> {
    try {
      const htmlContent = generateUserBookingHtml(booking);

      const message = {
        from: `"Moving" <${config().business.contact_email}>`,
        to: userEmail,
        subject: 'Reserva creada',
        html: htmlContent,
      };

      return await this.transporter.sendMail(message);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
