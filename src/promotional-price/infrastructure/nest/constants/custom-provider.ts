import { Provider } from '@nestjs/common';
import { PromotionalPriceService } from '../../../application/services/promotional-price.service';
import { IPromotionalPriceRepository } from '../../../domain/repositories/promotional-price.interface.repository';
import { IPromotionalPriceService } from '../../../domain/services/promotional-price.interface.service';
import SymbolsPromotionalPrice from '../../../symbols-promotional-price';
import { PromotionalPriceRepository } from '../../mongo/repositories/promotional-price.repository';

export const promotionalPriceProviders: Provider[] = [
    {
        provide: SymbolsPromotionalPrice.IPromotionalPriceRepository,
        useClass: PromotionalPriceRepository,
    },
    {
        provide: SymbolsPromotionalPrice.IPromotionalPriceService,
        useClass: PromotionalPriceService,
    },
];

export const promotionalPriceRepository = {
    provide: SymbolsPromotionalPrice.IPromotionalPriceRepository,
    useClass: PromotionalPriceRepository,
};

export const promotionalPriceService = {
    provide: SymbolsPromotionalPrice.IPromotionalPriceService,
    useClass: PromotionalPriceService,
};
