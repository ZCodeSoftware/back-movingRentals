import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

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

export class CreateContractDTO {
  @ApiProperty({ description: 'Booking ID' })
  @IsString()
  booking: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(2000)
  @Max(10000)
  @ApiProperty({ description: 'Contract number', minimum: 2000, maximum: 10000 })
  contractNumber: number;

  @ApiProperty({ description: 'Reserving user ID' })
  @IsString()
  reservingUser: string;

  @ApiPropertyOptional({ description: 'Contract status ID' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Extension data', type: ContractExtensionDTO })
  @IsOptional()
  extension?: ContractExtensionDTO;
}

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
  extension?: ContractExtensionDTO;
}