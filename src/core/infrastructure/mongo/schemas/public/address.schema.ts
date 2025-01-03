import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { CatCountry } from '../catalogs/cat-country.schema';
import { User } from './user.schema';

export type AddressDocument = HydratedDocument<Address>;

@Schema({ collection: 'address', timestamps: true })
export class Address {
  @Prop({ required: false })
  street: string;

  @Prop({ required: false })
  number: string;

  @Prop({ required: false })
  state: string;

  @Prop({ required: false })
  postalCode: string;

  @Prop({ required: false })
  city: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'CatCountry' })
  country: CatCountry;

  @Prop({
    type: {
      lat: { type: Number, required: false },
      lon: { type: Number, required: false },
    },
    required: false,
  })
  coords: {
    lat: number;
    lon: number;
  };

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] })
  users: User[];
}

export const AddressSchema = SchemaFactory.createForClass(Address);
