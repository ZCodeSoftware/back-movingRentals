import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CatContractEventDocument = HydratedDocument<CatContractEvent>;

@Schema({ collection: 'cat_contract_event', timestamps: true })
export class CatContractEvent {
  @Prop({ type: String, unique: true })
  name: string;
}

export const CatContractEventSchema = SchemaFactory.createForClass(CatContractEvent);
