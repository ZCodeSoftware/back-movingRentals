import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CatModelDocument = HydratedDocument<CatModel>;

@Schema({ collection: 'cat_model', timestamps: true })
export class CatModel {
  @Prop({ unique: true })
  name: string;
}

export const CatModelSchema =
  SchemaFactory.createForClass(CatModel);
