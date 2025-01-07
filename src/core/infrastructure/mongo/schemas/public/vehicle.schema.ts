import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { HydratedDocument } from "mongoose";
import { CatCategory } from "../catalogs/cat-category.schema";
import { CatModel } from "../catalogs/cat-model.schema";
import { VehicleOwner } from "./vehicle-owner.schema";

export type VehicleDocument = HydratedDocument<Vehicle>;

@Schema({ collection: 'vehicle', timestamps: true })
export class Vehicle {
    @Prop()
    name: string;

    @Prop()
    tag: string

    @Prop({ required: false })
    description: string;

    @Prop({ required: false })
    images: string[];


    @Prop({ required: false })
    price: number;

    @Prop({ required: false })
    pricePer4: number;

    @Prop({ required: false })
    pricePer8: number;

    @Prop({ required: false })
    pricePer24: number;

    @Prop()
    capacity: number;

    @Prop()
    minRentalHours: number;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'CatCategory' })
    category: CatCategory

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'VehicleOwner' })
    owner: VehicleOwner;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'CatModel' })
    model: CatModel;
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);
