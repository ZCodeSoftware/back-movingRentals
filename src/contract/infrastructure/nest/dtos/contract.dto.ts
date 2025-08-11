import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';


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
}

export class ReportEventDTO {
  @ApiProperty({ description: 'El tipo de evento, definido por el usuario.', example: 'Pérdida de Casco' })
  @IsString()
  @IsNotEmpty()
  eventType: string;

  @ApiProperty({ description: 'Descripción detallada del evento.' })
  @IsString()
  @IsNotEmpty()
  details: string;

  @ApiPropertyOptional({ description: 'Datos estructurados adicionales sobre el evento.' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}