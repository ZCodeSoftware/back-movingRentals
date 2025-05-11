import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { CatPaymentMethod } from '../catalogs/cat-payment-method.schema';

export type BookingDocument = HydratedDocument<Booking>;

@Schema({ collection: 'booking', timestamps: true })
export class Booking {
  @Prop({ type: String, required: true })
  cart: string;

  @Prop({ type: Date, nullable: true })
  limitCancelation: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'CatPaymentMethod' })
  paymentMethod: CatPaymentMethod;

  @Prop({ type: Number, required: true })
  total: number;

  @Prop({ type: Number, required: false })
  totalPaid?: number;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
