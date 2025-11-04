import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Booking } from './booking.schema';
import { User } from './user.schema';
import { Vehicle } from './vehicle.schema';
import { VehicleOwner } from './vehicle-owner.schema';

export type CommissionDocument = HydratedDocument<Commission>;

@Schema({ collection: 'commission', timestamps: true })
export class Commission {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true })
  booking: Booking;

  @Prop({ type: Number, required: true })
  bookingNumber: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'VehicleOwner', required: true })
  vehicleOwner: VehicleOwner;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: false })
  vehicle?: Vehicle;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' }], default: [] })
  vehicles?: Vehicle[];

  @Prop({ type: String, default: 'Renta' })
  detail: string;

  @Prop({ type: String, enum: ['PENDING', 'PAID', 'CANCELLED'], default: 'PENDING' })
  status: 'PENDING' | 'PAID' | 'CANCELLED';

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: String, enum: ['booking', 'extension'], default: 'booking' })
  source: 'booking' | 'extension';

  @Prop({ type: Number, required: false })
  commissionPercentage?: number;

  @Prop({ type: Boolean, default: false })
  isManual?: boolean;
}

export const CommissionSchema = SchemaFactory.createForClass(Commission);
