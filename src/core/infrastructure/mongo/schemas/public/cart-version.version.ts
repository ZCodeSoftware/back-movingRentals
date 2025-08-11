import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Booking } from './booking.schema';
import { Cart, CartSchema } from './cart.schema';

export type CartVersionDocument = HydratedDocument<CartVersion>;

@Schema({ collection: 'cart_versions', timestamps: true })
export class CartVersion {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true })
    booking: Booking;

    @Prop({ type: Number, required: true })
    version: number;

    @Prop({ type: CartSchema, required: true })
    data: Cart;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'ContractHistory' })
    createdByEvent?: mongoose.Types.ObjectId;
}

export const CartVersionSchema = SchemaFactory.createForClass(CartVersion);