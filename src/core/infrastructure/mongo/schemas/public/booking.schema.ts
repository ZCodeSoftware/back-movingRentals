import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { CatPaymentMethod } from '../catalogs/cat-payment-method.schema';

export type BookingDocument = HydratedDocument<Booking>;

@Schema({ collection: 'booking', timestamps: true })
export class Booking {
  @Prop({ type: String, required: true })
  cart: string;

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
