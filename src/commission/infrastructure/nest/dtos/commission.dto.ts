import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateCommissionDTO {
  @ApiPropertyOptional({ 
    description: 'New commission amount in MXN',
    example: 3500,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ 
    description: 'New commission percentage (0-100)',
    example: 15,
    minimum: 0,
    maximum: 100
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionPercentage?: number;
}
