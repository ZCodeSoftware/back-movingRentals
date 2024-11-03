import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateRoleDTO {
  @IsNotEmpty({ message: 'The rol name is required' })
  @ApiProperty()
  @IsString()
  name: string;
}
