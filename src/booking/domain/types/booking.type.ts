export interface ICreateBooking {
  cart: string;
  limitCancelation?: Date;
  paymentMethod: string;
}
