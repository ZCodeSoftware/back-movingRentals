import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CatCategoryDocument = HydratedDocument<CatCategory>;

@Schema({ collection: 'cat_category', timestamps: true })
export class CatCategory {
    @Prop({ type: String, unique: true })
    name: string;

    @Prop({ type: String, required: false })
    disclaimer?: string;
}

export const CatCategorySchema = SchemaFactory.createForClass(CatCategory);
