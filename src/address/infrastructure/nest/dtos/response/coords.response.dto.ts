import { ApiProperty } from '@nestjs/swagger';

export class CoordsResponseDTO {
  @ApiProperty()
  lat?: number;

  @ApiProperty()
  lon?: number;
}
