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

  @IsOptional()
  @ApiPropertyOptional({ description: 'Indicates if vehicle delivery is required' })
  @IsBoolean()
  requiresDelivery?: boolean;

  @IsOptional()
  @ApiPropertyOptional({ description: 'Type of delivery: one-way or round-trip', enum: ['one-way', 'round-trip'] })
  @IsString()
  deliveryType?: 'one-way' | 'round-trip';

  @IsOptional()
  @ApiPropertyOptional({ description: 'For one-way delivery: pickup (vehicle pickup) or delivery (vehicle drop-off)', enum: ['pickup', 'delivery'] })
  @IsString()
  oneWayType?: 'pickup' | 'delivery';

  @IsOptional()
  @ApiPropertyOptional({ description: 'Delivery address for the vehicle' })
  @IsString()
  deliveryAddress?: string;

  @IsOptional()
  @ApiPropertyOptional({ description: 'Cost of the delivery service' })
  @IsNumber()
  deliveryCost?: number;

  @IsOptional()
  @ApiPropertyOptional({ description: 'Distance of the delivery in kilometers' })
  @IsNumber()
  deliveryDistance?: number;
}
