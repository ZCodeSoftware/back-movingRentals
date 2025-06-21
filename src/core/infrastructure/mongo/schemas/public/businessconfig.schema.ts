import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema } from "mongoose";

export type BusinessConfigDocument = HydratedDocument<BusinessConfig>;

@Schema({ collection: 'businessconfig', timestamps: true })
export class BusinessConfig {
    @Prop({ name: "usd_value", required: false, type: Number })
    usdValue?: number;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branches', required: true })
    branch: string;
}

export const BusinessConfigSchema = SchemaFactory.createForClass(BusinessConfig);
