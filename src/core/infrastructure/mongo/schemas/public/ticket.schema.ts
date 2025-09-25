import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { HydratedDocument } from "mongoose";
import { CatCategory } from "../catalogs/cat-category.schema";

export type TicketDocument = HydratedDocument<Ticket>;

@Schema({ collection: 'ticket', timestamps: true })
export class Ticket {
    @Prop()
    name: string;

    @Prop()
    description: string;

    @Prop()
    location: string;

    @Prop()
    totalPrice: number;

    @Prop({ default: true })
    isActive: boolean;

    @Prop({ default: false })
    isDeleted: boolean;

    @Prop()
    movingPrice: number;

    @Prop()
    cenotePrice: number;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'CatCategory' })
    category: CatCategory
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);

// Exclude logically deleted documents by default
TicketSchema.pre(/^find/, function (next) {
  // @ts-ignore - this refers to the current mongoose query
  this.where({ isDeleted: { $ne: true } });
  next();
});

TicketSchema.pre('countDocuments', function (next) {
  // @ts-ignore - this refers to the current mongoose query
  this.where({ isDeleted: { $ne: true } });
  next();
});
