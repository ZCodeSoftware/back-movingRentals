import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateBookingDTO {
  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  cart: string;

  @IsOptional()
  @ApiPropertyOptional()
  @IsDate()
  @Type(() => Date)
  limitCancelation: Date;

  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  paymentMethod: string;

  @IsOptional()
  @ApiProperty()
  @IsString()
  status?: string;

  @IsNotEmpty()
  @ApiProperty()
  @IsNumber()
  total: number;

  @IsOptional()
  @ApiPropertyOptional()
  @IsNumber()
  totalPaid?: number;

  @IsOptional()
  @ApiPropertyOptional()
  @IsBoolean()
  isValidated?: boolean = false;

  @IsOptional()
  @ApiPropertyOptional({ description: 'Source of the booking', enum: ['Web', 'Dashboard'], default: 'Web' })
  @IsString()
  source?: string;

  @IsOptional()
  @ApiPropertyOptional({ description: 'Concierge (VehicleOwner) ID for Dashboard bookings' })
  @IsString()
  concierge?: string;

  @IsOptional()
  @ApiPropertyOptional({ description: 'Metadata for booking (contactSource, hotel, paymentMedium, depositNote, etc.)' })
  metadata?: Record<string, any>;

  @IsOptional()
  @ApiPropertyOptional({ description: 'Commission percentage for the booking' })
  @IsNumber()
  commission?: number;

  @IsOptional()
  @ApiPropertyOptional({ description: 'Indicates if this is a reservation (partial payment)' })
  @IsBoolean()
  isReserve?: boolean;
}
