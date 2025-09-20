import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { HydratedDocument } from "mongoose";
import { DatesDTO } from "../../../../../cart/infrastructure/nest/dtos/cart.dto";
import { Branches } from "./branches.schema";
import { Ticket } from "./ticket.schema";
import { Tour } from "./tour.schema";
import { Transfer } from "./transfer.schema";
import { Vehicle } from "./vehicle.schema";

export type CartDocument = HydratedDocument<Cart>;

interface Passenger {
    adult: number;
    child: number;
}

@Schema({ collection: 'cart', timestamps: true })
export class Cart {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Branches' })
    branch: Branches;

    @Prop({
        type: [{
            transfer: { type: mongoose.Schema.Types.ObjectId, ref: 'Transfer' },
            date: Date,
            passengers: { adults: Number, child: Number },
            quantity: Number
        }]
    })
    transfer: {
        transfer: Transfer,
        date: Date,
        passengers: Passenger,
        quantity: number
    }[];

    @Prop({
        type: [{
            vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
            total: Number,
            dates: {
                start: { type: Date },
                end: { type: Date }
            },
            passengers: { adults: Number, child: Number }
        }]
    })
    vehicles: {
        vehicle: Vehicle,
        total: number,
        dates: DatesDTO
        passengers: Passenger
    }[];

    @Prop({
        type: [{
            tour: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour' },
            date: Date,
            quantity: Number,
            passengers: { adults: Number, child: Number }
        }]
    })
    tours: {
        tour: Tour,
        date: Date,
        quantity: number
        passengers: Passenger
    }[];

    @Prop({
        type: [{
            ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' },
            date: Date,
            quantity: Number,
            passengers: { adults: Number, child: Number }
        }]
    })
    tickets: {
        ticket: Ticket,
        date: Date
        quantity: number
        passengers: Passenger
    }[];

    @Prop({ type: Boolean, required: false, default: false })
    delivery?: boolean;

    @Prop({ type: String, required: false })
    deliveryAddress?: string;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
