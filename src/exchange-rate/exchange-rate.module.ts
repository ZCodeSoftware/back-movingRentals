import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ExchangeRateService } from "./application/services/ExchangeRate.service";
import { ExchangeRateApi } from "./infrastructure/adapters/ExchangeRateApi";
import { ExchangeRateController } from "./infrastructure/nest/controllers/ExchangeRate.controller";
import SymbolsExchangeRate from "./Symbols";


@Module({
  controllers: [ExchangeRateController],
  imports: [HttpModule],
  providers: [
    {
      provide: SymbolsExchangeRate.IExchangeRateApiAdapter,
      useClass: ExchangeRateApi,
    },
    {
      provide: SymbolsExchangeRate.IExchangeRateService,
      useClass: ExchangeRateService,
    }
  ],
  exports: [ExchageRateModule, SymbolsExchangeRate.IExchangeRateApiAdapter],
})
export class ExchageRateModule { }
