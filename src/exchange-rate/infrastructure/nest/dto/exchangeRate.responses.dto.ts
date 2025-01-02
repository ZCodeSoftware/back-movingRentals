
import { ApiProperty } from '@nestjs/swagger';
import { ExchangeRateDto } from '../../../domain/dtos/ExchangeRate.dto';

export class ExchangeRate extends ExchangeRateDto {
  @ApiProperty()
  baseCode?: string;
  @ApiProperty()
  conversionRate?: number;
  @ApiProperty()
  errorType?: string;
  @ApiProperty()
  result: string;
  @ApiProperty()
  targetCode?: string;
  @ApiProperty()
  timeLastUpdateUnix?: number;
  @ApiProperty()
  timeLastUpdateUtc?: string;
  @ApiProperty()
  timeNextUpdateUnix?: number;
  @ApiProperty()
  timeNextUpdateUtc?: string;
}
