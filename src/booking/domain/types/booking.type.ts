export interface ICreateBooking {
  cart: string;
  bookingStartDate: Date;
  bookingEndDate: Date;
  limitCancelation: Date;
  paymentMethod: string;
}
