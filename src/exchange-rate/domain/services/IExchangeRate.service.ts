import { ExchangeRateDto } from '../dtos/ExchangeRate.dto';

export interface IExchangeRateService {
  getExchangeRatePair(codeBase: string, codeChange: string): Promise<ExchangeRateDto>;
}
