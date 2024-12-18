import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsString } from 'class-validator';

export class CreateBookingDTO {
  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  cart: string;

  @IsNotEmpty()
  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  bookingStartDate: Date;

  @IsNotEmpty()
  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  bookingEndDate: Date;

  @IsNotEmpty()
  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  limitCancelation: Date;

  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  paymentMethod: string;
}
