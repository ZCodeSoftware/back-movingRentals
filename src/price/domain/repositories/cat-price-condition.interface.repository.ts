import { CatPriceConditionModel } from "../models/cat-price-condition.model";

export interface ICatPriceConditionRepository {
    findById(id: string): Promise<CatPriceConditionModel>
}