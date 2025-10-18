import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Contract } from './contract.schema';
import { User } from './user.schema';

export type ContractHistoryDocument = HydratedDocument<ContractHistory>;

export enum ContractAction {
    CONTRACT_CREATED = 'CONTRACT_CREATED',
    STATUS_UPDATED = 'STATUS_UPDATED',
    EXTENSION_ADDED = 'EXTENSION_ADDED',
    EXTENSION_UPDATED = 'EXTENSION_UPDATED',
    BOOKING_MODIFIED = 'BOOKING_MODIFIED',
    NOTE_ADDED = 'NOTE_ADDED',
}

@Schema({ _id: false, strict: false })
export class ChangeDetail {
    @Prop({ type: String, required: true })
    field: string;

    @Prop({ type: mongoose.Schema.Types.Mixed })
    oldValue?: any;

    @Prop({ type: mongoose.Schema.Types.Mixed })
    newValue: any;

    // Nuevos campos para exponer snapshots/metadata en el timeline:
    @Prop({ type: mongoose.Schema.Types.Mixed })
    cartSnapshot?: any;

    @Prop({ type: mongoose.Schema.Types.Mixed })
    eventSnapshot?: any;
}
const ChangeDetailSchema = SchemaFactory.createForClass(ChangeDetail);

@Schema({ collection: 'contract_history', timestamps: true })
export class ContractHistory {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true, index: true })
    contract: Contract;

    @Prop({ type: String, enum: ContractAction, required: true })
    action: ContractAction;

    // --- CAMPO RELACIONADO AL CATALOGO DE EVENTOS DE CONTRATO ---
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'CatContractEvent', required: false, index: true })
    eventType?: any; // Referencia al catálogo CatContractEvent

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    performedBy: User;

    @Prop({ type: String })
    createdBy?: string;

    @Prop({ type: [ChangeDetailSchema], default: [] })
    changes: ChangeDetail[];

    @Prop({ type: String })
    details?: string;

    @Prop({ type: mongoose.Schema.Types.Mixed })
    eventMetadata?: Record<string, any>;

    // Relación con movimientos
    @Prop({ required: false, type: mongoose.Schema.Types.ObjectId, ref: 'Movement' })
    relatedMovement?: mongoose.Types.ObjectId;

    // Campos para soft delete
    @Prop({ type: Boolean, default: false, index: true })
    isDeleted: boolean;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false })
    deletedBy?: User;

    @Prop({ type: String })
    deletedByInfo?: string;

    @Prop({ type: Date, required: false })
    deletedAt?: Date;

    @Prop({ type: String, required: false })
    deletionReason?: string;
}

export const ContractHistorySchema = SchemaFactory.createForClass(ContractHistory);

// Middleware para excluir registros eliminados por defecto
ContractHistorySchema.pre(/^find/, function (next) {
  // @ts-ignore - this refers to the current mongoose query
  this.where({ isDeleted: { $ne: true } });
  next();
});

ContractHistorySchema.pre('countDocuments', function (next) {
  // @ts-ignore - this refers to the current mongoose query
  this.where({ isDeleted: { $ne: true } });
  next();
});