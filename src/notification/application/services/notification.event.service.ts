import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { BookingModel } from '../../../booking/domain/models/booking.model';
import { IAdminEmailAdapter } from '../../../notification/domain/adapter/admin-email.interface.adapter';
import SymbolsNotification from '../../../notification/symbols-notification';
import { IUserEmailAdapter } from '../../domain/adapter/user-email.interface.adapter';
import { INotificationEventService } from '../../domain/services/notificacion.event.interface.service';

@Injectable()
export class NotificationEventService implements INotificationEventService {
  constructor(
    @Inject(SymbolsNotification.IUserEmailAdapter)
    private readonly userEmailAdapter: IUserEmailAdapter,

    @Inject(SymbolsNotification.IAdminEmailAdapter)
    private readonly adminEmailAdapter: IAdminEmailAdapter,
  ) { }

  async reservationUserEmail(email: string, name: string): Promise<any> {
    try {
      return await this.userEmailAdapter.reservationUserEmail(email, name);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async reservationAdminEmail(email: string, adminName: string): Promise<any> {
    try {
      return await this.adminEmailAdapter.reservationAdminEmail(
        email,
        adminName,
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async sendBookingCreated(
    booking: BookingModel,
    userEmail: string,
  ): Promise<any> {
    try {
      await this.userEmailAdapter.sendUserBookingCreated(booking, userEmail);

      await this.adminEmailAdapter.sendAdminBookingCreated(booking);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async sendUserForgotPassword(email: string, token: string): Promise<any> {
    try {
      return await this.userEmailAdapter.sendUserForgotPassword(email, token);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
