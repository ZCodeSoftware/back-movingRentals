import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { HydratedDocument } from "mongoose";
import { TypeCatTypeMovement } from "../../../../domain/enums/type-cat-type-movement";
import { User } from "./user.schema";
import { Vehicle } from "./vehicle.schema";

export type MovementDocument = HydratedDocument<Movement>;

@Schema({ collection: 'movement', timestamps: true })
export class Movement {
    @Prop({ required: true, enum: TypeCatTypeMovement })
    type: TypeCatTypeMovement;

    @Prop({ required: false, type: String })
    detail?: string;

    @Prop({ required: true, type: Number })
    amount: number;

    @Prop({ required: true, type: Date })
    date: Date;

    @Prop({ required: false, type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' })
    vehicle?: Vehicle;

    @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'User' })
    createdBy: User;
}

export const MovementSchema = SchemaFactory.createForClass(Movement);
