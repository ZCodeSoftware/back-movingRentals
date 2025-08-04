import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';
import { CatPaymentMethodModel } from './cat-payment-method.model';
import { CatStatusModel } from './cat-status.model';

export class BookingModel extends BaseModel {
  private _cart: string;
  private _limitCancelation: Date;
  private _paymentMethod: CatPaymentMethodModel;
  private _status: CatStatusModel;
  private _total: number;
  private _totalPaid?: number;
  private _bookingNumber: number;
  private _isValidated: boolean;

  public toJSON() {
    const aggregate = this._id ? { _id: this._id.toValue() } : {};
    return {
      ...aggregate,
      cart: this._cart,
      limitCancelation: this._limitCancelation,
      status: this._status ? this._status.toJSON() : null,
      paymentMethod: this._paymentMethod ? this._paymentMethod.toJSON() : null,
      total: this._total,
      totalPaid: this._totalPaid,
      bookingNumber: this._bookingNumber,
      isValidated: this._isValidated,
    };
  }

  addPaymentMethod(paymentMethod: CatPaymentMethodModel): void {
    this._paymentMethod = paymentMethod;
  }

  addStatus(status: CatStatusModel): void {
    this._status = status;
  }

  payBooking(paid: boolean): void {
    if (paid) {
      this._totalPaid = this._total;
    }
  }

  validateBooking(): void {
    this._isValidated = true;
  }

  static create(booking: any): BookingModel {
    const newBooking = new BookingModel(new Identifier(booking._id));

    newBooking._cart = booking.cart;
    newBooking._limitCancelation = booking.limitCancelation;
    newBooking._total = booking.total;
    newBooking._totalPaid = booking.totalPaid;
    newBooking._paymentMethod = booking.paymentMethod
    newBooking._isValidated = booking.isValidated ?? false;

    return newBooking;
  }

  static hydrate(booking: any): BookingModel {
    const newBooking = new BookingModel(new Identifier(booking._id));

    newBooking._cart = booking.cart;
    newBooking._limitCancelation = booking.limitCancelation;
    newBooking._total = booking.total;
    newBooking._totalPaid = booking.totalPaid;
    newBooking._paymentMethod = booking.paymentMethod
      ? CatPaymentMethodModel.hydrate(booking.paymentMethod)
      : null;
    newBooking._status = booking.status
      ? CatStatusModel.hydrate(booking.status)
      : null;
    newBooking._bookingNumber = booking.bookingNumber;
    newBooking._isValidated = booking.isValidated;

    return newBooking;
  }
}
