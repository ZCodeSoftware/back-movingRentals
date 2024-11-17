import { CatPriceConditionModel } from "../models/cat-price-condition.model";

export interface ICatPriceConditionRepository {
    create(priceCondition: CatPriceConditionModel): Promise<CatPriceConditionModel>
    findById(id: string): Promise<CatPriceConditionModel>
    findAll(): Promise<CatPriceConditionModel[]>
}