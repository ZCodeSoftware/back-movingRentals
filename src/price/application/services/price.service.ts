import { Inject, Injectable } from "@nestjs/common";
import SymbolsCatalogs from "../../../catalogs/symbols-catalogs";
import { PriceModel } from "../../domain/models/price.model";
import { ICatPriceConditionRepository } from "../../domain/repositories/cat-price-condition.interface.repository";
import { IPriceRepository } from "../../domain/repositories/price.interface.repository";
import { IPriceService } from "../../domain/services/price.interface.service";
import { ICreatePrice } from "../../domain/types/price.types";
import SymbolsPrice from "../../symbols-price";

@Injectable()
export class PriceService implements IPriceService {
    constructor(
        @Inject(SymbolsPrice.IPriceRepository)
        private readonly priceRepository: IPriceRepository,
        @Inject(SymbolsCatalogs.ICatPriceConditionRepository)
        private readonly catPriceConditionRepository: ICatPriceConditionRepository
    ) { }

    async findAll() {
        return this.priceRepository.findAll();
    }

    async findById(id: string) {
        return this.priceRepository.findById(id);
    }

    async create(data: ICreatePrice) {
        const catPriceCondition = await this.catPriceConditionRepository.findById(data.priceCondition);
        const priceModel = PriceModel.create(data);
        priceModel.addPriceCondition(catPriceCondition);
        return this.priceRepository.create(priceModel);
    }
}