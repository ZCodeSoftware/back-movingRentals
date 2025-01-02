
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AxiosError, AxiosResponse } from 'axios';
import { catchError, lastValueFrom, map } from 'rxjs';
import config from '../../../config';
import { BaseErrorException } from '../../../core/domain/exceptions/base.error.exception';
import { IExchangeRateApiAdapter } from '../../domain/adapters/IExchangeRate.adapter';
import { ExchangeRateApiResponse, ExchangeRateHistoricalApiRes } from '../../domain/types/ExchangeRateApi.type';

@Injectable()
export class ExchangeRateApi implements IExchangeRateApiAdapter {
  private readonly URL_API: string;
  private readonly API_KEY: string;
  constructor(private readonly httpService: HttpService) {
    this.URL_API = config().exchangeRate.url;
    this.API_KEY = config().exchangeRate.apiKey;
  }

  async getHistoricalData(
    baseCurrency: string,
    year: number,
    month: number,
    day: number,
  ): Promise<ExchangeRateHistoricalApiRes> {
    const url = `${this.URL_API}/${this.API_KEY}/history/${baseCurrency}/${year}/${month}/${day}`;
    // this.logger.log(url);

    return await lastValueFrom(
      this.httpService.get<ExchangeRateHistoricalApiRes>(url).pipe(
        map((axiosResponse: AxiosResponse<ExchangeRateHistoricalApiRes>) => {
          // this.logger.log(axiosResponse.data);
          if (axiosResponse.data.result === 'error') return axiosResponse.data;
          return axiosResponse.data;
        }),
        catchError((error: AxiosError) => {
          if (error.response.status === 404) throw new BaseErrorException('unsupported-code', 400);
          else throw new BaseErrorException(error.response.data['error-type'], 400);
        }),
      ),
    );
  }

  async getExchangeRatePair(baseCurrency: string, targeCurrency: string): Promise<ExchangeRateApiResponse> {
    const url = `${this.URL_API}/${this.API_KEY}/pair/${baseCurrency}/${targeCurrency}`;

    return await lastValueFrom(
      this.httpService.get<ExchangeRateApiResponse>(url).pipe(
        map((axiosResponse: AxiosResponse<ExchangeRateApiResponse>) => {
          if (axiosResponse.data.result === 'error') return axiosResponse.data;
          return axiosResponse.data;
        }),
        catchError((error: AxiosError) => {
          if (error.response.status === 404) throw new BaseErrorException('unsupported-code', 400);
          else throw new BaseErrorException(error.response.data['error-type'], 400);
        }),
      ),
    );
  }
}
