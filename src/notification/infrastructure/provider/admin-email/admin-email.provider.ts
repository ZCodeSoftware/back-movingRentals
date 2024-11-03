import config from '../../../../config';
import { Resend } from 'resend';
import { IAdminEmailAdapter } from '../../../../notification/domain/adapter/admin-email.interface.adapter';
import { lowStockReportTemplate } from './low-stock-report.template';
import { InternalServerErrorException } from '@nestjs/common';

export class AdminEmailProvider implements IAdminEmailAdapter {
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
}
