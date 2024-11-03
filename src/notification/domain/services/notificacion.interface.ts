export interface INotificationService {
  reservationUserEmail(email: string, name: string): Promise<any>;
  reservationAdminEmail(email: string, adminName: string): Promise<any>;
}
