import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import SymbolsNotification from '../../../notification/symbols-notification';
import { IUserEmailAdapter } from '../../domain/adapter/user-email.interface.adapter';
import { INotificationService } from '../../domain/services/notification.interface.service';
import { IContactUser } from '../../domain/types/notifications.types';

@Injectable()
export class NotificationService implements INotificationService {
  constructor(
    @Inject(SymbolsNotification.IUserEmailAdapter)
    private readonly userEmailAdapter: IUserEmailAdapter,
  ) {}

  async sendContactUserEmail(data: IContactUser): Promise<any> {
    try {
      return await this.userEmailAdapter.sendContactUserEmail(data);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
