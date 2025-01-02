
import { Controller, Get, Inject, Param } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse
} from '@nestjs/swagger';
import SymbolsExchangeRate from '../../../Symbols';
import { IExchangeRateService } from '../../../domain/services/IExchangeRate.service';

@ApiTags('Exchange Rate')
@Controller('/exchange-rate')
@ApiUnauthorizedResponse({
  description: 'Unauthorized',
})
export class ExchangeRateController {
  constructor(
    @Inject(SymbolsExchangeRate.IExchangeRateService)
    private readonly exchangeService: IExchangeRateService,
  ) { }

  @ApiOperation({
    summary: 'Make a request to exchange-rate-api to get a specific currency',
    description: 'Endpoint to make a request to exchange-rate-api to get a specific currency',
  })
  @ApiResponse({
    status: 200,
  })
  @Get('/pair/:baseCurrency/:targetCurrency')
  async pair(@Param('baseCurrency') baseCurrency: string, @Param('targetCurrency') targetCurrency: string) {
    return await this.exchangeService.getExchangeRatePair(baseCurrency, targetCurrency);
  }
}