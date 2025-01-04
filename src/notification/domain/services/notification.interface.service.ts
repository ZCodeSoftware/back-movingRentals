import { IContactUser } from '../types/notifications.types';

export interface INotificationService {
  sendContactUserEmail(data: IContactUser): Promise<any>;
}
