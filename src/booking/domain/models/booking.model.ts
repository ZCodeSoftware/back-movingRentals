import { BaseModel } from '../../../core/domain/models/base.model';
import { Identifier } from '../../../core/domain/value-objects/identifier';
import { CatPaymentMethodModel } from './cat-payment-method.model';
import { CatStatusModel } from './cat-status.model';

export interface IPaymentEntry {
  amount: number;
  paymentMethod: string;
  paymentMedium?: '$' | 'US$' | 'E$' | 'AR$' | 'CAN' | 'GBP' | 'CLIP' | 'CUENTA' | 'PAYPAL' | 'MERCADO PAGO' | 'PAGO PENDIENTE' | 'ZELLE' | 'OTRO';
  paymentDate: Date;
  paymentType: 'STRIPE' | 'CASH' | 'TRANSFER' | 'OTHER';
  notes?: string;
  percentage?: number;
  status: 'PAID' | 'PENDING' | 'FAILED';
  validatedBy?: string;
  validatedAt?: Date;
}

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
  private _deliveryDistance?: number;
  private _payments?: IPaymentEntry[];

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
      deliveryDistance: this._deliveryDistance,
      payments: this._payments || [],
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  addPayment(payment: Partial<IPaymentEntry> & { amount: number; paymentMethod: string; paymentType: 'STRIPE' | 'CASH' | 'TRANSFER' | 'OTHER' }): void {
    if (!this._payments) {
      this._payments = [];
    }
    this._payments.push({
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      paymentMedium: payment.paymentMedium,
      paymentDate: payment.paymentDate || new Date(),
      paymentType: payment.paymentType,
      notes: payment.notes,
      percentage: payment.percentage,
      status: payment.status || 'PAID',
      validatedBy: payment.validatedBy,
      validatedAt: payment.validatedAt
    });
  }

  getPayments(): IPaymentEntry[] {
    return this._payments || [];
  }

  getTotalPaidFromPayments(): number {
    if (!this._payments || this._payments.length === 0) {
      return 0;
    }
    return this._payments
      .filter(p => p.status === 'PAID')
      .reduce((sum, p) => sum + p.amount, 0);
  }

  getPaymentsByType(type: 'STRIPE' | 'CASH' | 'TRANSFER' | 'OTHER'): IPaymentEntry[] {
    if (!this._payments) {
      return [];
    }
    return this._payments.filter(p => p.paymentType === type);
  }

  isFullyPaid(): boolean {
    const totalPaid = this.getTotalPaidFromPayments();
    return totalPaid >= this._total;
  }

  getRemainingAmount(): number {
    const totalPaid = this.getTotalPaidFromPayments();
    return Math.max(0, this._total - totalPaid);
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

  payBooking(paid: boolean, amount?: number): void {
    if (paid) {
      // Si se proporciona un monto específico, usarlo; si no, usar el total
      this._totalPaid = amount !== undefined ? amount : this._total;
      
      // Si el monto pagado es igual o mayor al total, ya no es una reserva
      if (this._totalPaid >= this._total) {
        this._isReserve = false;
      }
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
    newBooking._deliveryDistance = booking.deliveryDistance;
    newBooking._payments = booking.payments || [];

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
    newBooking._deliveryDistance = booking.deliveryDistance;
    newBooking._payments = booking.payments || [];
    newBooking._createdAt = booking.createdAt;
    newBooking._updatedAt = booking.updatedAt;

    return newBooking;
  }
}
