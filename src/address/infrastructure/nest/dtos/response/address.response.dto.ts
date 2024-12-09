import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CoordsResponseDTO } from './coords.response.dto';

export class AddressReponseDTO {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  street: string;

  @ApiProperty()
  number: string;

  @ApiProperty()
  state: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  country: string;

  @ApiProperty()
  postalCode: string;

  @ApiProperty()
  @Type(() => CoordsResponseDTO)
  coords: CoordsResponseDTO;
}
