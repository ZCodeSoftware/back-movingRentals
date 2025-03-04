import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type ChoosingDocument = HydratedDocument<Choosing>;

class Translate {
    @Prop({ type: String, required: true })
    en: string;

    @Prop({ type: String, required: true })
    es: string;
}

@Schema({ collection: 'choosing', timestamps: true })
export class Choosing {
    @Prop({ type: Translate, required: true })
    title: Translate;

    @Prop({ type: String, required: false })
    icon?: string;

    @Prop({ type: Translate, required: true })
    text: Translate;
}

export const ChoosingSchema = SchemaFactory.createForClass(Choosing);
