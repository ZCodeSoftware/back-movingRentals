import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { HydratedDocument } from "mongoose";
import { TypeCatPaymentMethodAdmin } from "../../../../domain/enums/type-cat-payment-method-admin";
import { TypeCatTypeMovement } from "../../../../domain/enums/type-cat-type-movement";
import { TypeMovementDirection } from "../../../../domain/enums/type-movement-direction";
import { User } from "./user.schema";
import { VehicleOwner } from "./vehicle-owner.schema";
import { Vehicle } from "./vehicle.schema";

export type MovementDocument = HydratedDocument<Movement>;

@Schema({ collection: 'movement', timestamps: true })
export class Movement {
  @Prop({ required: true, enum: TypeCatTypeMovement })
  type: TypeCatTypeMovement;

  @Prop({ required: true, enum: TypeMovementDirection })
  direction: TypeMovementDirection;

  @Prop({ required: false, type: String })
  detail?: string;

  @Prop({ required: true, type: Number })
  amount: number;

  @Prop({ required: true, type: Date })
  date: Date;

  @Prop({ required: true, enum: TypeCatPaymentMethodAdmin })
  paymentMethod: TypeCatPaymentMethodAdmin;

  @Prop({ required: false, type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' })
  vehicle?: Vehicle;

  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  createdBy: User;

  @Prop({
    required: false, // Hazlo requerido si un beneficiario es siempre necesario para los pagos
    type: mongoose.Schema.Types.ObjectId,
    // La propiedad 'refPath' le dice a Mongoose que mire el campo 'beneficiaryModel'
    // para saber a qué colección debe apuntar este ObjectId.
    refPath: 'beneficiaryModel'
  })
  beneficiary?: User | VehicleOwner; // En TypeScript, puede ser de cualquiera de los dos tipos

  @Prop({
    required: false, // Requerido si 'beneficiary' es requerido
    type: String,
    // Este enum asegura que solo se puedan referenciar los modelos permitidos.
    enum: ['User', 'VehicleOwner']
  })
  beneficiaryModel?: string; // Aquí guardamos el nombre del modelo: 'User' o 'VehicleOwner'

  // Relación con el histórico de contratos
  @Prop({ required: false, type: mongoose.Schema.Types.ObjectId, ref: 'ContractHistory' })
  contractHistoryEntry?: mongoose.Types.ObjectId;

  // Campos para soft delete
  @Prop({ type: Boolean, default: false, index: true })
  isDeleted: boolean;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false })
  deletedBy?: User;

  @Prop({ type: Date, required: false })
  deletedAt?: Date;

  @Prop({ type: String, required: false })
  deletionReason?: string;
}

export const MovementSchema = SchemaFactory.createForClass(Movement);


