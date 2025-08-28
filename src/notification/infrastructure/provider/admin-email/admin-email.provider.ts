import { InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { BookingModel } from '../../../../booking/domain/models/booking.model';
import config from '../../../../config';
import { IAdminEmailAdapter } from '../../../../notification/domain/adapter/admin-email.interface.adapter';
import { generateAdminBookingNotification } from './admin-booking-content.template';
import { lowStockReportTemplate } from './low-stock-report.template';

export class AdminEmailProvider implements IAdminEmailAdapter {
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
  async reservationAdminEmail(email: string, adminName: string): Promise<any> {
    try {
      const resend = new Resend(config().providerEmail.resend.apyKey);

      const { data, error } = await resend.emails.send({
        from: 'Test <onboarding@resend.dev>',
        to: ['test.soporte@gmail.com'],
        subject: 'Test',
        html: lowStockReportTemplate(adminName),
      });

      if (error) throw new Error('error');

      return data;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async sendAdminBookingCreated(booking: BookingModel): Promise<any> {
    try {
      const { subject, html } = generateAdminBookingNotification(booking);

      const message = {
        from: `"Moving" <${config().business.contact_email}>`,
        to: config().business.contact_email,
        subject: subject,
        html: html,
      };

      return await this.transporter.sendMail(message);
    } catch (error) {
      console.error(
        'Error al enviar el correo de notificación al admin:',
        error,
      );
      throw new InternalServerErrorException(error.message);
    }
  }
}
