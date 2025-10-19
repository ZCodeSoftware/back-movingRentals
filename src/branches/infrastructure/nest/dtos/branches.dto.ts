import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

export class CreateCarouselDTO {
  @IsNotEmpty()
  @ApiProperty({ description: 'ID del vehículo asociado al carousel' })
  @IsMongoId()
  vehicleId: string;

  @IsOptional()
  @ApiPropertyOptional({ description: 'Descripción opcional del carousel' })
  @IsString()
  description?: string;

  @IsOptional()
  @ApiPropertyOptional({ description: 'Descripción opcional del carousel en inglés' })
  @IsString()
  descriptionEn?: string;

  @IsNotEmpty()
  @ApiProperty({
    description: 'Array de colores en formato hexadecimal',
    example: ['#FF5733', '#33FF57', '#3357FF']
  })
  @IsArray()
  colors: string[];
}