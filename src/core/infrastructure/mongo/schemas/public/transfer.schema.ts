import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { HydratedDocument } from "mongoose";
import { CatCategory } from "../catalogs/cat-category.schema";

export type TransferDocument = HydratedDocument<Transfer>;

@Schema({ collection: 'transfer', timestamps: true })
export class Transfer {
    @Prop({ type: String, required: true })
    name: string;

    @Prop({ type: String, required: false })
    description?: string;

    @Prop({ default: true })
    isActive: boolean;

    @Prop({ type: Number, required: true })
    capacity: number;

    @Prop({ type: String, required: true })
    estimatedDuration: string;

    @Prop({ type: Number, required: true })
    price: number;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'CatCategory' })
    category: CatCategory
}

export const TransferSchema = SchemaFactory.createForClass(Transfer);
