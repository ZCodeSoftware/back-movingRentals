import { ApiProperty } from '@nestjs/swagger';

export class CatDocumentResponseDTO {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}
