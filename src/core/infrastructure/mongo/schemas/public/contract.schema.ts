import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { CatPaymentMethod } from '../catalogs/cat-payment-method.schema';
import { CatStatus } from '../catalogs/cat-status.schema';
import { Booking } from './booking.schema';
import { User } from './user.schema';

export type ContractDocument = HydratedDocument<Contract>;

@Schema({ _id: false })
export class ContractExtension {
  @Prop({ type: Date, required: false })
  newEndDateTime?: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'CatPaymentMethod', required: false })
  paymentMethod?: CatPaymentMethod;

  @Prop({ type: Number, required: false })
  extensionAmount?: number;

  @Prop({ type: Number, required: false, min: 0, max: 100 })
  commissionPercentage?: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'CatStatus', required: false })
  extensionStatus?: CatStatus;
}

const ContractExtensionSchema = SchemaFactory.createForClass(ContractExtension);

@Schema({ collection: 'contracts', timestamps: true })
export class Contract {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true })
  booking: Booking;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  reservingUser: User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  createdByUser: User;

  @Prop({ type: Number, required: true, unique: true, min: 2000, max: 10000 })
  contractNumber: number;

  @Prop({ type: ContractExtensionSchema, required: false })
  extension?: ContractExtension;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'CatStatus' })
  status: CatStatus;
}

export const ContractSchema = SchemaFactory.createForClass(Contract);