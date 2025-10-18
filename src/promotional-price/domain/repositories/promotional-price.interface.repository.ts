import { PromotionalPriceModel } from '../models/promotional-price.model';

export interface IPromotionalPriceRepository {
    create(promotionalPrice: PromotionalPriceModel): Promise<PromotionalPriceModel>;
    findById(id: string): Promise<PromotionalPriceModel>;
    findAll(filters: any): Promise<PromotionalPriceModel[]>;
    findByModelAndDate(modelId: string, date: Date): Promise<PromotionalPriceModel | null>;
    update(id: string, promotionalPrice: PromotionalPriceModel): Promise<PromotionalPriceModel>;
    softDelete(id: string): Promise<void>;
}
