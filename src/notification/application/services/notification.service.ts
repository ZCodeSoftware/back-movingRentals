import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import SymbolsNotification from '../../../notification/symbols-notification';
import { IUserEmailAdapter } from '../../domain/adapter/user-email.interface.adapter';
import { IAdminEmailAdapter } from '../../../notification/domain/adapter/admin-email.interface.adapter';
import { INotificationService } from '../../../notification/domain/services/notificacion.interface';

@Injectable()
export class NotificationService implements INotificationService {
  constructor(
    @Inject(SymbolsNotification.IUserEmailAdapter)
    private readonly userEmailAdapter: IUserEmailAdapter,

    @Inject(SymbolsNotification.IAdminEmailAdapter)
    private readonly adminEmailAdapter: IAdminEmailAdapter,
  ) {}

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
}
