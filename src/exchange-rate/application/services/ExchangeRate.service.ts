
import { Inject, Injectable } from '@nestjs/common';
import { IExchangeRateApiAdapter } from '../../domain/adapters/IExchangeRate.adapter';
import { ExchangeRateDto } from '../../domain/dtos/ExchangeRate.dto';
import { ExchangeRateMapper } from '../../domain/mappers/ExchangeRate.mapper';
import { IExchangeRateService } from '../../domain/services/IExchangeRate.service';
import SymbolsExchangeRate from '../../Symbols';

@Injectable()
export class ExchangeRateService implements IExchangeRateService {
  constructor(
    @Inject(SymbolsExchangeRate.IExchangeRateApiAdapter)
    private apiExchangeRate: IExchangeRateApiAdapter,
  ) { }
  async getExchangeRatePair(baseCurrency: string, targeCurrency: string): Promise<ExchangeRateDto> {
    const data = await this.apiExchangeRate.getExchangeRatePair(baseCurrency, targeCurrency);

    return new ExchangeRateMapper(data).execute();
  }
}
