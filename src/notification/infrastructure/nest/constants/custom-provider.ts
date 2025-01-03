import { NotificationEventService } from '../../../application/services/notification.event.service';
import { NotificationService } from '../../../application/services/notification.service';
import SymbolsNotification from '../../../symbols-notification';
import { AdminEmailProvider } from '../../provider/admin-email/admin-email.provider';
import { UserEmailProvider } from '../../provider/user-email/user-email.provider';

export const notificationEventService = {
  provide: SymbolsNotification.INotificationEventService,
  useClass: NotificationEventService,
};

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
