import { PriceModel } from "../models/price.model";

export interface IPriceRepository {
    findAll(): Promise<PriceModel[]>
    findById(id: string): Promise<PriceModel>
    create(data: PriceModel): Promise<PriceModel>
}