import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class CreateCoordsDTO {
  @IsOptional()
  @ApiPropertyOptional()
  lat?: number;

  @IsOptional()
  @ApiPropertyOptional()
  lon?: number;
}
