import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { HydratedDocument } from "mongoose";
import { Vehicle } from "./vehicle.schema";

export type CarouselDocument = HydratedDocument<Carousel>;

@Schema({ collection: 'carousel', timestamps: true })
export class Carousel {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' })
    vehicle: Vehicle;

    @Prop({
        type: String,
        required: false,
        default: ''
    })
    description: string;

    @Prop({
        type: [String],
        required: true,
        validate: {
            validator: (colors: string[]) => {
                return colors.every(color => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color));
            },
            message: 'Los colores deben ser códigos hexadecimales válidos'
        }
    })
    colors: string[];
}

export const CarouselSchema = SchemaFactory.createForClass(Carousel);