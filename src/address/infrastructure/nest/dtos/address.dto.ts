import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CreateCoordsDTO } from './coords.dto';

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

  @IsOptional()
  @ApiPropertyOptional()
  @Type(() => CreateCoordsDTO)
  coords?: CreateCoordsDTO;
}
