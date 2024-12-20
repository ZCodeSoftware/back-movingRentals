import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCatDocumentDTO {
  @IsNotEmpty({ message: 'The document name is required' })
  @ApiProperty()
  @IsString()
  name: string;
}
