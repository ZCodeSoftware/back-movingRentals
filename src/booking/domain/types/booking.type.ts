export interface ICreateBooking {
  cart: string;
  limitCancelation?: Date;
  paymentMethod: string;
  total: number;
  totalPaid?: number;
  isValidated?: boolean;
  concierge?: string;
}
