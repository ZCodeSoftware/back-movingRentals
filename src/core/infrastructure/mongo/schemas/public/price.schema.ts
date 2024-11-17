import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { CatPriceCondition } from '../catalogs/cat-price-condition.schema';

export type PriceDocument = HydratedDocument<Price>;

@Schema({ collection: 'price', timestamps: true })
export class Price {
    @Prop({ unique: true })
    amount: string;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'CatPriceCondition' })
    priceCondition: CatPriceCondition
}

export const PriceSchema = SchemaFactory.createForClass(Price);
