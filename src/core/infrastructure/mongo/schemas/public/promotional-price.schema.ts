import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { HydratedDocument } from "mongoose";
import { CatModel } from "../catalogs/cat-model.schema";

export type PromotionalPriceDocument = HydratedDocument<PromotionalPrice>;

@Schema({ collection: 'promotional_price', timestamps: true })
export class PromotionalPrice {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'CatModel', required: true })
    model: CatModel;

    @Prop({ required: true })
    startDate: Date;

    @Prop({ required: true })
    endDate: Date;

    @Prop({ required: false })
    price?: number;

    @Prop({ required: false })
    pricePer4?: number;

    @Prop({ required: false })
    pricePer8?: number;

    @Prop({ required: false })
    pricePer24?: number;

    @Prop({ required: false })
    pricePerWeek?: number;

    @Prop({ required: false })
    pricePerMonth?: number;

    @Prop({ default: true })
    isActive: boolean;

    @Prop({ default: false })
    isDeleted: boolean;

    @Prop({ required: false })
    description?: string;
}

export const PromotionalPriceSchema = SchemaFactory.createForClass(PromotionalPrice);

// Exclude logically deleted documents by default
PromotionalPriceSchema.pre(/^find/, function (next) {
    // @ts-ignore
    this.where({ isDeleted: { $ne: true } });
    next();
});

PromotionalPriceSchema.pre('countDocuments', function (next) {
    // @ts-ignore
    this.where({ isDeleted: { $ne: true } });
    next();
});
