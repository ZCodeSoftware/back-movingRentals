import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { CatRole } from '../catalogs/cat-role.schema';
import { Booking } from './booking.schema';
import { Company } from './company.schema';
import { Document } from './documet.schema';

export type UserDocument = HydratedDocument<User>;

@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop()
  name: string;

  @Prop()
  lastName: string;

  @Prop()
  email: string;

  @Prop()
  password: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'CatRole' })
  role: CatRole;

  @Prop()
  cellphone: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Document' })
  documentation: Document[];

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Company' })
  company: Company;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  newsletter: boolean;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
    required: false,
  })
  bookings: Booking[];
}

export const UserSchema = SchemaFactory.createForClass(User);
