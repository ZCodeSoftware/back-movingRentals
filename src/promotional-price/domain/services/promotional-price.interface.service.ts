import { PromotionalPriceModel } from '../models/promotional-price.model';
import { ICreatePromotionalPrice, IUpdatePromotionalPrice } from '../types/promotional-price.type';

export interface IPromotionalPriceService {
    create(promotionalPrice: ICreatePromotionalPrice): Promise<PromotionalPriceModel>;
    findById(id: string): Promise<PromotionalPriceModel>;
    findAll(filters: any): Promise<PromotionalPriceModel[]>;
    findByModelAndDate(modelId: string, date: Date): Promise<PromotionalPriceModel | null>;
    update(id: string, promotionalPrice: IUpdatePromotionalPrice): Promise<PromotionalPriceModel>;
    delete(id: string): Promise<void>;
}
