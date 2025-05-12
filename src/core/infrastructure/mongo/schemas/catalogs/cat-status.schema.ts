import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CatStatusDocument = HydratedDocument<CatStatus>;

@Schema({ collection: 'cat_status', timestamps: true })
export class CatStatus {
    @Prop({ unique: true })
    name: string;
}

export const CatStatusSchema = SchemaFactory.createForClass(CatStatus);
