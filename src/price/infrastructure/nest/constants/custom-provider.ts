import SymbolsCatalogs from "../../../../catalogs/symbols-catalogs";
import { PriceService } from "../../../application/services/price.service";
import SymbolsPrice from "../../../symbols-price";
import { CatPriceConditionRepository } from "../../mongo/repositories/cat-price-condition.repository";
import { PriceRepository } from "../../mongo/repositories/price.repository";

export const priceRepository = {
    provide: SymbolsPrice.IPriceRepository,
    useClass: PriceRepository
}

export const priceService = {
    provide: SymbolsPrice.IPriceService,
    useClass: PriceService
}

export const catPriceConditionRepository = {
    provide: SymbolsCatalogs.ICatPriceConditionRepository,
    useClass: CatPriceConditionRepository
}