import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type VehicleOwnerDocument = HydratedDocument<VehicleOwner>;

@Schema({ collection: 'vehicle_owner', timestamps: true })
export class VehicleOwner {
    @Prop()
    name: string;

    @Prop({ default: true })
    isActive: boolean;

    @Prop({ min: 0, max: 100 })
    commissionPercentage: number;
}

export const VehicleOwnerSchema = SchemaFactory.createForClass(VehicleOwner);