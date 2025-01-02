export class ExchangeRateDto {
  result: string;
  timeLastUpdateUnix?: number;
  timeLastUpdateUtc?: string;
  timeNextUpdateUnix?: number;
  timeNextUpdateUtc?: string;
  baseCode?: string;
  targetCode?: string;
  conversionRate?: number;
  errorType?: string;
}

export class ExchangeRateHistoricalDto {
  result: string;
  year?: number;
  month?: number;
  day?: number;
  baseCode?: string;
  errorType?: string;
}
