import { CatPriceConditionModel } from "../models/cat-price-condition.model";
import { ICatPriceConditionCreate } from "../types/cat-price-condition.type";

export interface ICatPriceConditionService {
    create(priceCondition: ICatPriceConditionCreate): Promise<CatPriceConditionModel>
    findById(id: string): Promise<CatPriceConditionModel>
    findAll(): Promise<CatPriceConditionModel[]>
}