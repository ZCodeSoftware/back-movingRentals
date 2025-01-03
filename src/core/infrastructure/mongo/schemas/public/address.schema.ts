import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { CatCountry } from '../catalogs/cat-country.schema';
import { User } from './user.schema';

export type AddressDocument = HydratedDocument<Address>;

@Schema({ collection: 'address', timestamps: true })
export class Address {
  @Prop({ required: true })
  street: string;

  @Prop({ required: true })
  number: string;

  @Prop({ required: true })
  state: string;

  @Prop({ required: true })
  postalCode: string;

  @Prop({ required: true })
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
