import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateAddressDTO {

  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  countryId: string;

}
