import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateContractEventDTO {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  name: string;
}
