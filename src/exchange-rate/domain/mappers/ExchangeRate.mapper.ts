
import { BaseMapper } from '../../../core/domain/mappers/base.mapper';
import { ExchangeRateDto } from '../dtos/ExchangeRate.dto';
import { ExchangeRateApiResponse } from '../types/ExchangeRateApi.type';


export class ExchangeRateMapper extends BaseMapper {
  exchangeRateDto: ExchangeRateDto;

  constructor(exchangeRateResponse: ExchangeRateApiResponse) {
    super();
    const omitParams = ['documentation', 'termsOfUse'];
    this.exchangeRateDto = this.snakeToCamel(exchangeRateResponse, omitParams);
  }

  public execute(): ExchangeRateDto {
    return this.exchangeRateDto;
  }
}

