import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { HydratedDocument } from "mongoose";
import { DatesDTO } from "../../../../../cart/infrastructure/nest/dtos/cart.dto";
import { Branches } from "./branches.schema";
import { Ticket } from "./ticket.schema";
import { Tour } from "./tour.schema";
import { Transfer } from "./transfer.schema";
import { Vehicle } from "./vehicle.schema";

export type CartDocument = HydratedDocument<Cart>;

@Schema({ collection: 'cart', timestamps: true })
export class Cart {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Branches' })
    branch: Branches;

    @Prop({ type: [{ transfer: { type: mongoose.Schema.Types.ObjectId, ref: 'Transfer' }, date: Date }] })
    transfer: { transfer: Transfer, date: Date }[];

    @Prop({
        type: {
            adults: Number,
            childrens: Number
        }
    })
    travelers: {
        adults: number;
        childrens: number;
    }

    @Prop({
        type: [{
            vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
            total: Number,
            dates: {
                start: { type: Date },
                end: { type: Date }
            }
        }]
    })
    vehicles: {
        vehicle: Vehicle,
        total: number,
        dates: DatesDTO
    }[];

    @Prop({
        type: [{
            tour: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour' },
            date: Date
        }]
    })
    tours: {
        tour: Tour,
        date: Date
    }[];

    @Prop({
        type: [{
            ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' },
            date: Date
        }]
    })
    tickets: {
        ticket: Ticket,
        date: Date
    }[];

}

export const CartSchema = SchemaFactory.createForClass(Cart);
