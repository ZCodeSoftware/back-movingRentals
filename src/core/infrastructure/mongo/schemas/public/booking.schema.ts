import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { CatPaymentMethod } from '../catalogs/cat-payment-method.schema';

export type BookingDocument = HydratedDocument<Booking>;

@Schema({ collection: 'booking', timestamps: true })
export class Booking {
  @Prop({ type: String, required: true })
  cart: string;

  @Prop({ type: Date, required: true })
  bookingStartDate: Date;

  @Prop({ type: Date, required: true })
  bookingEndDate: Date;

  @Prop({ type: Date, required: true })
  limitCancelation: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'CatPaymentMethod' })
  paymentMethod: CatPaymentMethod;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
