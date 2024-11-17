import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CatPriceConditionDocument = HydratedDocument<CatPriceCondition>;

@Schema({ collection: 'cat_price_condition', timestamps: true })
export class CatPriceCondition {
  @Prop({ unique: true })
  name: string;
}

export const CatPriceConditionSchema = SchemaFactory.createForClass(CatPriceCondition);
