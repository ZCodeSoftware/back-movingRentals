import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CatCountryDocument = HydratedDocument<CatCountry>;

@Schema({ collection: 'cat_country', timestamps: true })
export class CatCountry {
    @Prop({ unique: true })
    nameEn: string;

    @Prop({ unique: true })
    nameEs: string;

    @Prop({ unique: true })
    code: string;
}

export const CatCountrySchema = SchemaFactory.createForClass(CatCountry);
