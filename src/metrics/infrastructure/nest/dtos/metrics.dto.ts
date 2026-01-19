import { IsOptional, IsString, IsNumber, IsDateString, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class MetricsFiltersDTO {
  @IsOptional()
  @IsIn(['day', 'week', 'month', 'lastMonth', 'year', 'range'])
  dateFilterType?: 'day' | 'week' | 'month' | 'lastMonth' | 'year' | 'range';

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

  @IsOptional()
  @IsIn(['INCOME', 'EXPENSE'])
  transactionType?: 'INCOME' | 'EXPENSE';

  @IsOptional()
  @IsString()
  movementType?: string;

  @IsOptional()
  @IsIn(['revenue', 'bookingCount', 'categoryName', 'utilizationPercentage', 'duration', 'count', 'amount'])
  sortBy?: 'revenue' | 'bookingCount' | 'categoryName' | 'utilizationPercentage' | 'duration' | 'count' | 'amount';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  page?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  limit?: number;
}