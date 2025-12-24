import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { CatPaymentMethod } from '../catalogs/cat-payment-method.schema';

export type BookingDocument = HydratedDocument<Booking>;

@Schema({ collection: 'booking', timestamps: true })
export class Booking {
  @Prop({ type: String, required: true })
  cart: string;

  @Prop({ type: mongoose.Schema.Types.Mixed, required: false })
  metadata?: Record<string, any>;

  @Prop({ type: Number, required: false })
  commission?: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'VehicleOwner', required: false })
  concierge?: mongoose.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CartVersion',
    required: false,
  })
  activeCartVersion?: mongoose.Types.ObjectId;

  @Prop({ type: Date, nullable: true })
  limitCancelation: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'CatPaymentMethod' })
  paymentMethod: CatPaymentMethod;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'CatStatus' })
  status: mongoose.Schema.Types.ObjectId;

  @Prop({ type: Number, required: true })
  total: number;

  @Prop({ type: Number, required: false })
  totalPaid?: number;

  @Prop({ type: Number, unique: true })
  bookingNumber: number;

  @Prop({ type: Boolean, default: false })
  isValidated: boolean;

  @Prop({ type: Boolean, default: false })
  isReserve: boolean;

  @Prop({ type: Boolean, required: false })
  requiresDelivery?: boolean;

  @Prop({ type: String, enum: ['one-way', 'round-trip'], required: false })
  deliveryType?: string;

  @Prop({ type: String, enum: ['pickup', 'delivery'], required: false })
  oneWayType?: string;

  @Prop({ type: String, required: false })
  deliveryAddress?: string;

  @Prop({ type: Number, required: false })
  deliveryCost?: number;

  @Prop({ type: Number, required: false })
  deliveryDistance?: number;

  @Prop({
    type: [
      {
        amount: { type: Number, required: true },
        paymentMethod: { type: mongoose.Schema.Types.Mixed, required: false },
        paymentMedium: { 
          type: String, 
          enum: ['$', 'US$', 'E$', 'AR$', 'CAN', 'GBP', 'CLIP', 'CUENTA', 'PAYPAL', 'MERCADO PAGO', 'PAGO PENDIENTE', 'ZELLE', 'OTRO'], 
          required: false 
        },
        paymentDate: { type: Date, required: true, default: Date.now },
        paymentType: { type: String, enum: ['STRIPE', 'CASH', 'TRANSFER', 'OTHER'], required: true },
        notes: { type: String, required: false },
        percentage: { type: Number, required: false },
        status: { type: String, enum: ['PAID', 'PENDING', 'FAILED'], required: true, default: 'PAID' },
        validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
        validatedAt: { type: Date, required: false }
      }
    ],
    required: false,
    default: []
  })
  payments?: Array<{
    amount: number;
    paymentMethod: mongoose.Types.ObjectId | string;
    paymentMedium?: '$' | 'US$' | 'E$' | 'AR$' | 'CAN' | 'GBP' | 'CLIP' | 'CUENTA' | 'PAYPAL' | 'MERCADO PAGO' | 'PAGO PENDIENTE' | 'ZELLE' | 'OTRO';
    paymentDate: Date;
    paymentType: 'STRIPE' | 'CASH' | 'TRANSFER' | 'OTHER';
    notes?: string;
    percentage?: number;
    status: 'PAID' | 'PENDING' | 'FAILED';
    validatedBy?: mongoose.Types.ObjectId;
    validatedAt?: Date;
  }>;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);

BookingSchema.pre('save', async function (next) {
  if (this.isNew && !this.bookingNumber) {
    try {
      const BookingModel = this.constructor as mongoose.Model<Booking>;

      const lastBooking = await BookingModel.findOne({}, { bookingNumber: 1 })
        .sort({ bookingNumber: -1 })
        .exec();

      this.bookingNumber =
        lastBooking?.bookingNumber && lastBooking.bookingNumber >= 7300
          ? lastBooking.bookingNumber + 1
          : 7300;

      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});
