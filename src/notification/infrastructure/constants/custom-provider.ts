import SymbolsNotification from '../../../notification/symbols-notification';
import { UserEmailProvider } from '../provider/user-email/user-email.provider';
import { AdminEmailProvider } from '../provider/admin-email/admin-email.provider';
import { NotificationService } from '../../../notification/application/services/notification.service';

export const notificationService = {
  provide: SymbolsNotification.INotificationService,
  useClass: NotificationService,
};

export const userEmailAdapter = {
  provide: SymbolsNotification.IUserEmailAdapter,
  useClass: UserEmailProvider,
};

export const adminEmailAdapter = {
  provide: SymbolsNotification.IAdminEmailAdapter,
  useClass: AdminEmailProvider,
};
