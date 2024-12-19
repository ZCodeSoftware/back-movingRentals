import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class UserBookingDTO {
  @IsNotEmpty()
  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  bookings: string[];
}
