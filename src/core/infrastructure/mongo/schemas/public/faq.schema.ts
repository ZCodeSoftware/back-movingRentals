import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type FaqDocument = HydratedDocument<Faq>;

class Translate {
    @Prop({ type: String, required: true })
    en: string;

    @Prop({ type: String, required: true })
    es: string;
}

class FaqItem {
    @Prop({ type: Translate, required: true })
    question: Translate;

    @Prop({ type: Translate, required: true })
    answer: Translate;
}

@Schema({ collection: 'faq', timestamps: true })
export class Faq {
    @Prop({ type: Translate, required: true })
    title: Translate;

    @Prop({ type: String, required: false })
    icon?: string;

    @Prop({ type: [FaqItem], required: true })
    faqItems: FaqItem[];
}

export const FaqSchema = SchemaFactory.createForClass(Faq);
