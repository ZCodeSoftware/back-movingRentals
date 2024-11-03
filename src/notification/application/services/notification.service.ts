import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import SymbolsNotification from '../../../notification/symbols-notification';
import { IUserEmailAdapter } from '../../../notification/domain/adapter/email.interface.adapter';
import { INotificationService } from '../../../notification/domain/services/notificacion.interface';

@Injectable()
export class NotificationService implements INotificationService {
  constructor(
    @Inject(SymbolsNotification.IUserEmailAdapter)
    private readonly userEmailAdapter: IUserEmailAdapter,
  ) {}

  async reservationEmail(email: string, name: string): Promise<any> {
    try {
      return await this.userEmailAdapter.reservationEmail(email, name);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
