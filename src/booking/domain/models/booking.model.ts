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
  private _isReserve: boolean;
  private _metadata?: Record<string, any>;
  private _commission?: number;
  private _concierge?: string;
  private _requiresDelivery?: boolean;
  private _deliveryType?: 'one-way' | 'round-trip';
  private _oneWayType?: 'pickup' | 'delivery';
  private _deliveryAddress?: string;
  private _deliveryCost?: number;

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
      isReserve: this._isReserve,
      metadata: this._metadata,
      commission: this._commission,
      concierge: this._concierge,
      requiresDelivery: this._requiresDelivery,
      deliveryType: this._deliveryType,
      oneWayType: this._oneWayType,
      deliveryAddress: this._deliveryAddress,
      deliveryCost: this._deliveryCost,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  addPaymentMethod(paymentMethod: CatPaymentMethodModel): void {
    this._paymentMethod = paymentMethod;
  }

  addStatus(status: CatStatusModel): void {
    this._status = status;
  }

  addMetadata(metadata: Record<string, any>): void {
    this._metadata = metadata;
  }

  addCommission(commission: number): void {
    this._commission = commission;
  }

  payBooking(paid: boolean): void {
    if (paid) {
      this._totalPaid = this._total;
    }
  }

  validateBooking(): void {
    this._isValidated = true;
  }

  confirmReservation(): void {
    this._isReserve = false;
    this._totalPaid = this._total;
  }

  cancelBooking(): void {
    // Este método puede ser usado para lógica adicional de cancelación si es necesario
    // Por ahora, la cancelación se maneja principalmente cambiando el estado
  }

  static create(booking: any): BookingModel {
    const newBooking = new BookingModel(new Identifier(booking._id));

    newBooking._cart = booking.cart;
    newBooking._limitCancelation = booking.limitCancelation;
    newBooking._total = booking.total;
    newBooking._totalPaid = booking.totalPaid;
    newBooking._paymentMethod = booking.paymentMethod
    newBooking._isValidated = booking.isValidated ?? false;
    newBooking._isReserve = booking.isReserve ?? false;
    newBooking._metadata = booking.metadata;
    newBooking._commission = booking.commission;
    newBooking._concierge = booking.concierge;
    newBooking._requiresDelivery = booking.requiresDelivery;
    newBooking._deliveryType = booking.deliveryType;
    newBooking._oneWayType = booking.oneWayType;
    newBooking._deliveryAddress = booking.deliveryAddress;
    newBooking._deliveryCost = booking.deliveryCost;

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
    newBooking._isReserve = booking.isReserve ?? false;
    newBooking._metadata = booking.metadata;
    newBooking._commission = booking.commission;
    newBooking._concierge = booking.concierge;
    newBooking._requiresDelivery = booking.requiresDelivery;
    newBooking._deliveryType = booking.deliveryType;
    newBooking._oneWayType = booking.oneWayType;
    newBooking._deliveryAddress = booking.deliveryAddress;
    newBooking._deliveryCost = booking.deliveryCost;
    newBooking._createdAt = booking.createdAt;
    newBooking._updatedAt = booking.updatedAt;

    return newBooking;
  }
}
