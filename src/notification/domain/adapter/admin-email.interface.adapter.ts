export interface IAdminEmailAdapter {
  reservationAdminEmail(email: string, adminName: string): Promise<any>;
}
