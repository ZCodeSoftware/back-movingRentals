import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePaymentMethodDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;
}
