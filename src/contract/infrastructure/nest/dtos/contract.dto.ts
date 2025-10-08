import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { TypeCatPaymentMethodAdmin } from '../../../../core/domain/enums/type-cat-payment-method-admin';

// --- DTO para el sub-documento de la extensión ---
export class ContractExtensionDTO {
  @ApiPropertyOptional({ description: 'New end date and time for the extension' })
  @IsOptional()
  @IsDateString()
  newEndDateTime?: string;

  @ApiPropertyOptional({ description: 'Payment method ID for extension cost' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Amount charged for the extension' })
  @IsOptional()
  @IsNumber()
  extensionAmount?: number;

  @ApiPropertyOptional({ description: 'Commission percentage (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercentage?: number;

  @ApiPropertyOptional({ description: 'Extension status ID' })
  @IsOptional()
  @IsString()
  extensionStatus?: string;
}

// --- DTO para la creación de un nuevo contrato ---
// (No necesita cambios, ya que el carrito se define en el Booking)
export class CreateContractDTO {
  @ApiProperty({ description: 'Booking ID' })
  @IsString()
  @IsNotEmpty()
  booking: string;

  @ApiProperty({ description: 'Reserving user ID' })
  @IsString()
  @IsNotEmpty()
  reservingUser: string;

  @ApiPropertyOptional({ description: 'Contract status ID' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Extension data', type: ContractExtensionDTO })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContractExtensionDTO)
  extension?: ContractExtensionDTO;

  @ApiPropertyOptional({ description: 'Concierge (VehicleOwner) ID' })
  @IsOptional()
  @IsString()
  concierge?: string;

  @ApiPropertyOptional({ description: 'Source of the contract', enum: ['Web', 'Dashboard'], default: 'Web' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: 'Whether to send email notification to the client', default: true })
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;
}

// --- DTO para la actualización de un contrato (el que modificamos) ---
export class UpdateContractDTO {
  @ApiPropertyOptional({ description: 'Booking ID' })
  @IsOptional()
  @IsString()
  booking?: string;

  @ApiPropertyOptional({ description: 'Reserving user ID' })
  @IsOptional()
  @IsString()
  reservingUser?: string;

  @ApiPropertyOptional({ description: 'Contract status ID' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Extension data', type: ContractExtensionDTO })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContractExtensionDTO)
  extension?: ContractExtensionDTO;

  @ApiPropertyOptional({ description: 'Concierge (VehicleOwner) ID' })
  @IsOptional()
  @IsString()
  concierge?: string;

  @ApiPropertyOptional({ description: 'Source of the contract', enum: ['Web', 'Dashboard'] })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({
    description: 'El objeto completo del nuevo estado del carrito. Se acepta cualquier estructura de objeto.',
    type: Object,
  })
  @IsOptional()
  @IsObject()
  newCart?: any;

  @ApiPropertyOptional({
    description: 'Una justificación textual del cambio, requerida si se envía newCart.',
  })
  @IsOptional()
  @IsString()
  reasonForChange?: string;

  @ApiPropertyOptional({ description: 'ID del tipo de evento (CatContractEvent._id)' })
  @IsOptional()
  @IsString()
  eventType?: string;
}

export class ReportEventDTO {
  @ApiProperty({ description: 'ID del tipo de evento (CatContractEvent._id)' })
  @IsString()
  @IsNotEmpty()
  eventType: string;

  @ApiProperty({ description: 'Descripción detallada del evento.' })
  @IsString()
  @IsNotEmpty()
  details: string;

  @ApiProperty({ description: 'Importe del movimiento (ingreso).' })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ enum: TypeCatPaymentMethodAdmin, description: 'Método de pago' })
  @IsEnum(TypeCatPaymentMethodAdmin)
  @IsNotEmpty()
  paymentMethod: TypeCatPaymentMethodAdmin;

  @ApiPropertyOptional({ description: 'ID del vehículo asociado (opcional)' })
  @IsOptional()
  @IsString()
  vehicle?: string;

  @ApiPropertyOptional({ description: 'ID del beneficiario (User o VehicleOwner)' })
  @IsOptional()
  @IsString()
  beneficiary?: string;

  @ApiPropertyOptional({ description: 'Fecha del movimiento (ISO8601)' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Datos estructurados adicionales sobre el evento.' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class DeleteHistoryEntryDTO {
  @ApiPropertyOptional({ description: 'Razón de la eliminación del movimiento' })
  @IsOptional()
  @IsString()
  reason?: string;
}