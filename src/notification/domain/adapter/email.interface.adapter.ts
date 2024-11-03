export interface IUserEmailAdapter {
  reservationEmail(email: string, name: string): Promise<any>;
}
