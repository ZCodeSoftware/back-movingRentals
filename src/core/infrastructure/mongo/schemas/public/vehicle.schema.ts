import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { HydratedDocument } from "mongoose";
import { CatCategory } from "../catalogs/cat-category.schema";
import { VehicleOwner } from "./vehicle-owner.schema";

export type VehicleDocument = HydratedDocument<Vehicle>;

@Schema({ collection: 'vehicle', timestamps: true })
export class Vehicle {
    @Prop()
    name: string;

    @Prop()
    specs: string

    @Prop()
    description: string;

    @Prop()
    image: string;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'CatCategory' })
    category: CatCategory

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'VehicleOwner' })
    owner: VehicleOwner;
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);
