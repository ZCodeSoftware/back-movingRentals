import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { HydratedDocument } from "mongoose";
import { CatCategory } from "../catalogs/cat-category.schema";

export type TourDocument = HydratedDocument<Tour>;

@Schema({ collection: 'tour', timestamps: true })
export class Tour {
    @Prop()
    description: string;

    @Prop({ required: false })
    recommendations: string;

    @Prop()
    includes: string;

    @Prop({ required: false })
    images: string[];

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'CatCategory' })
    category: CatCategory;
}

export const TourSchema = SchemaFactory.createForClass(Tour);
