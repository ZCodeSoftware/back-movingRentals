import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { CatRole } from '../catalogs/cat-role.schema';
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

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  newsletter: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
