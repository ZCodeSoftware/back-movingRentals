import { ExchangeRateApiResponse } from "../types/ExchangeRateApi.type";


export interface IExchangeRateApiAdapter {
  getExchangeRatePair(baseCurrency: string, targeCurrency: string): Promise<ExchangeRateApiResponse>;
}
