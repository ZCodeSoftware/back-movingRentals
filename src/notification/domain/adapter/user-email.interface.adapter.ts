export interface IUserEmailAdapter {
  reservationUserEmail(email: string, name: string): Promise<any>;
}
