import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { HydratedDocument } from "mongoose";
import { CatCategory } from "../catalogs/cat-category.schema";

export type TourDocument = HydratedDocument<Tour>;

@Schema({ collection: 'tour', timestamps: true })
export class Tour {
    @Prop()
    name: string;

    @Prop()
    description: string;

    @Prop()
    price: number;

    @Prop()
    itinerary: string;

    @Prop({ required: false })
    capacity: string;

    @Prop({ required: false })
    estimatedDuration: string;

    @Prop({ required: false })
    startDates: string;

    @Prop({ default: true })
    isActive: boolean;

    @Prop({ default: false })
    isDeleted: boolean;

    @Prop({ required: false })
    images: string[];

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'CatCategory' })
    category: CatCategory;
}

export const TourSchema = SchemaFactory.createForClass(Tour);

// Exclude logically deleted documents by default
TourSchema.pre(/^find/, function (next) {
  // @ts-ignore - this refers to the current mongoose query
  this.where({ isDeleted: { $ne: true } });
  next();
});

TourSchema.pre('countDocuments', function (next) {
  // @ts-ignore - this refers to the current mongoose query
  this.where({ isDeleted: { $ne: true } });
  next();
});
