import { IsOptional, IsString, IsNumber, IsDateString, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class MetricsFiltersDTO {
  @IsOptional()
  @IsIn(['day', 'week', 'month', 'year', 'range'])
  dateFilterType?: 'day' | 'week' | 'month' | 'year' | 'range';

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  maxPrice?: number;

  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsString()
  bookingStatus?: string;

  @IsOptional()
  @IsIn(['new', 'recurring'])
  clientType?: 'new' | 'recurring';

  @IsOptional()
  @IsString()
  location?: string;
}