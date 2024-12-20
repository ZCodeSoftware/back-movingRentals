import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

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

  @Prop({ required: true })
  country: string;

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
}

export const AddressSchema = SchemaFactory.createForClass(Address);
