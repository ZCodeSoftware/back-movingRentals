import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from './user.schema';

export type CompanyDocument = HydratedDocument<Company>;

@Schema({ collection: 'companies', timestamps: true })
export class Company {
  @Prop()
  name: string;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] })
  users: User[];
}

export const CompanySchema = SchemaFactory.createForClass(Company);
