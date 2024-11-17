import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { CatDocument } from '../catalogs/cat-document.schema';

export type DocumentDocument = HydratedDocument<Document>;

@Schema({ collection: 'document', timestamps: true })
export class Document {
  @Prop({})
  value: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'CatDocument' })
  catDocument: CatDocument;
}

export const DocumentSchema = SchemaFactory.createForClass(Document);
