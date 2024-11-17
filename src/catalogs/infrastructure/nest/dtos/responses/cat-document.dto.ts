import { ApiProperty } from '@nestjs/swagger';

export class CatCatDocumentResponseDTO {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}
