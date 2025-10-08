import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DeleteMovementDTO {
  @ApiPropertyOptional({ description: 'Razón de la eliminación del movimiento' })
  @IsOptional()
  @IsString()
  reason?: string;
}