import { PriceModel } from "../models/price.model"
import { ICreatePrice } from "../types/price.types"

export interface IPriceService {
    findAll(): Promise<PriceModel[]>
    findById(id: string): Promise<PriceModel>
    create(data: ICreatePrice): Promise<PriceModel>
}