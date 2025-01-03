import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateAddressDTO {
  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  street: string;

  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  number: string;

  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  state: string;

  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  city: string;

  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  country: string;

  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  postalCode: string;
}
