import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Address } from './address.schema';
import { Carousel } from './carousel.schema';
import { Tour } from './tour.schema';
import { User } from './user.schema';
import { Vehicle } from './vehicle.schema';

export type BranchesDocument = HydratedDocument<Branches>;

@Schema({ collection: 'branches', timestamps: true })
export class Branches {
  @Prop({ required: true })
  name: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Address' })
  address: Address;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' }],
    required: false,
  })
  vehicles: Vehicle[];

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tour' }],
    required: false,
  })
  tours: Tour[];

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    required: false,
  })
  users: User[];

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Carousel' }],
    required: false,
    default: [],
  })
  carousel: Carousel[];
}

export const BranchesSchema = SchemaFactory.createForClass(Branches);
