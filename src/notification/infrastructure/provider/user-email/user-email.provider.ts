import { InternalServerErrorException } from '@nestjs/common';
import { IUserEmailAdapter } from '../../../domain/adapter/user-email.interface.adapter';
import * as nodemailer from 'nodemailer';

export class UserEmailProvider implements IUserEmailAdapter {
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      auth: {
        user: 'your-email@gmail.com',
        pass: 'your-password',
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
}
