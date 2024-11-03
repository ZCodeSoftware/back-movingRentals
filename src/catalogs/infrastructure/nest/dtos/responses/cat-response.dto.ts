import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CatRoleResponseDTO {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  name: string;
}
