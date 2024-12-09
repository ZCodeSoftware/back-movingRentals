import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBranchesDTO {
  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  address: string;

  @IsOptional()
  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  vehicles?: string[];

  @IsOptional()
  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  tours?: string[];

  @IsOptional()
  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  users?: string[];
}
