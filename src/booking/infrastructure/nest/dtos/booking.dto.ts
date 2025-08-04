import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

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
}
