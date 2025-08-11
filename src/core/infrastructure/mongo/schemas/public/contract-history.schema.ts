import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Contract } from './contract.schema';
import { User } from './user.schema';

export type ContractHistoryDocument = HydratedDocument<ContractHistory>;

// El enum se mantiene para las acciones del sistema
export enum ContractAction {
    CONTRACT_CREATED = 'CONTRACT_CREATED',
    STATUS_UPDATED = 'STATUS_UPDATED',
    EXTENSION_ADDED = 'EXTENSION_ADDED',
    EXTENSION_UPDATED = 'EXTENSION_UPDATED',
    BOOKING_MODIFIED = 'BOOKING_MODIFIED',
    NOTE_ADDED = 'NOTE_ADDED', // Usaremos esta acción para todos los eventos manuales
}

@Schema({ _id: false })
export class ChangeDetail {
    @Prop({ type: String, required: true })
    field: string;

    @Prop({ type: mongoose.Schema.Types.Mixed })
    oldValue?: any;

    @Prop({ type: mongoose.Schema.Types.Mixed })
    newValue: any;
}
const ChangeDetailSchema = SchemaFactory.createForClass(ChangeDetail);

@Schema({ collection: 'contract_history', timestamps: true })
export class ContractHistory {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true, index: true })
    contract: Contract;

    @Prop({ type: String, enum: ContractAction, required: true })
    action: ContractAction;

    // --- NUEVO CAMPO PARA EL TIPO DE EVENTO DEFINIDO POR EL USUARIO ---
    @Prop({ type: String, required: false, index: true })
    eventType?: string; // Ej: "Pérdida de Casco", "Daño en Pintura", "Multa de Tráfico"

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    performedBy: User;

    @Prop({ type: [ChangeDetailSchema], default: [] })
    changes: ChangeDetail[];

    @Prop({ type: String })
    details?: string;

    @Prop({ type: mongoose.Schema.Types.Mixed })
    eventMetadata?: Record<string, any>;
}

export const ContractHistorySchema = SchemaFactory.createForClass(ContractHistory);