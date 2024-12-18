import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';
import { CatPaymentMethodModel } from './cat-payment-method.model';

export class BookingModel extends BaseModel {
  private _cart: string;
  private _bookingStartDate: Date;
  private _bookingEndDate: Date;
  private _limitCancelation: Date;
  private _paymentMethod: CatPaymentMethodModel;

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      cart: this._cart,
      bookingStartDate: this._bookingStartDate,
      bookingEndDate: this._bookingEndDate,
      limitCancelation: this._limitCancelation,
      paymentMethod: this._paymentMethod ? this._paymentMethod.toJSON() : null,
    };
  }

  addPaymentMethod(paymentMethod: CatPaymentMethodModel): void {
    this._paymentMethod = paymentMethod;
  }

  static create(booking: any): BookingModel {
    const newBooking = new BookingModel(new Identifier(booking._id));

    newBooking._cart = booking.cart;
    newBooking._bookingStartDate = booking.bookingStartDate;
    newBooking._bookingEndDate = booking.bookingEndDate;
    newBooking._limitCancelation = booking.limitCancelation;

    return newBooking;
  }

  static hydrate(booking: any): BookingModel {
    const newBooking = new BookingModel(new Identifier(booking._id));

    newBooking._cart = booking.cart;
    newBooking._bookingStartDate = booking.bookingStartDate;
    newBooking._bookingEndDate = booking.bookingEndDate;
    newBooking._limitCancelation = booking.limitCancelation;
    newBooking._paymentMethod = booking.paymentMethod
      ? CatPaymentMethodModel.hydrate(booking.paymentMethod)
      : null;

    return newBooking;
  }
}
