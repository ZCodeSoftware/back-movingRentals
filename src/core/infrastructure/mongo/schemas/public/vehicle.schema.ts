import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { HydratedDocument } from "mongoose";
import { CatCategory } from "../catalogs/cat-category.schema";
import { CatModel } from "../catalogs/cat-model.schema";
import { VehicleOwner } from "./vehicle-owner.schema";

export type VehicleDocument = HydratedDocument<Vehicle>;

export class Reservation {
    @Prop({ required: true })
    start: Date;

    @Prop({ required: true })
    end: Date;

    @Prop({ required: false })
    bookingId?: string; // ID del booking asociado para identificar la reserva

    @Prop({ required: false })
    reservationId?: string; // ID único de la reserva para casos especiales
}

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

    @Prop({ default: true })
    isActive: boolean;

    @Prop({ default: false })
    isDeleted: boolean;

    @Prop({ type: [Reservation], required: false })
    reservations: Reservation[];

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'CatCategory' })
    category: CatCategory

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'VehicleOwner' })
    owner: VehicleOwner;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'CatModel' })
    model: CatModel;
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);

// Exclude logically deleted documents by default
VehicleSchema.pre(/^find/, function (next) {
  // @ts-ignore - this refers to the current mongoose query
  this.where({ isDeleted: { $ne: true } });
  next();
});

VehicleSchema.pre('countDocuments', function (next) {
  // @ts-ignore - this refers to the current mongoose query
  this.where({ isDeleted: { $ne: true } });
  next();
});
