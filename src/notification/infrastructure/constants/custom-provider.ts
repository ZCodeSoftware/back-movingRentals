import SymbolsNotification from '../../../notification/symbols-notification';
import { UserEmailProvier } from '../provider/user-email/user-email.provider';
import { NotificationService } from '../../../notification/application/services/notification.service';

export const notificationService = {
  provide: SymbolsNotification.INotificationService,
  useClass: NotificationService,
};

export const userEmailAdapter = {
  provide: SymbolsNotification.IUserEmailAdapter,
  useClass: UserEmailProvier,
};
