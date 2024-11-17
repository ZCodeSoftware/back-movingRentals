import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DocumentCreateDTO {
  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  value: string;

  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  catDocument: string;
}
