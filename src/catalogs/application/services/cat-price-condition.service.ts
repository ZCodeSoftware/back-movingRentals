import { Inject, Injectable } from "@nestjs/common";
import { CatPriceConditionModel } from "../../domain/models/cat-price-condition.model";
import { ICatPriceConditionRepository } from "../../domain/repositories/cat-price-condition.interface.repository";
import { ICatPriceConditionService } from "../../domain/services/cat-price-condition.interface.service";
import { ICatPriceConditionCreate } from "../../domain/types/cat-price-condition.type";
import SymbolsCatalogs from "../../symbols-catalogs";

@Injectable()
export class CatPriceConditionService implements ICatPriceConditionService {
    constructor(
        @Inject(SymbolsCatalogs.ICatPriceConditionRepository)
        private readonly catPriceConditionRepository: ICatPriceConditionRepository
    ) { }

    async create(priceCondition: ICatPriceConditionCreate): Promise<CatPriceConditionModel> {
        const priceConditionModel = CatPriceConditionModel.create(priceCondition);
        return this.catPriceConditionRepository.create(priceConditionModel);
    }

    async findById(id: string): Promise<CatPriceConditionModel> {
        return this.catPriceConditionRepository.findById(id);
    }

    async findAll(): Promise<CatPriceConditionModel[]> {
        return this.catPriceConditionRepository.findAll();
    }
}