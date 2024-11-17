import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CatDocumentDocument = HydratedDocument<CatDocument>;

@Schema({ collection: 'cat_document', timestamps: true })
export class CatDocument {
  @Prop({ unique: true })
  name: string;
}

export const CatDocumentSchema = SchemaFactory.createForClass(CatDocument);
