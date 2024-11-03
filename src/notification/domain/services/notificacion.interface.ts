export interface INotificationService {
  reservationEmail(email: string, name: string): Promise<any>;
}
