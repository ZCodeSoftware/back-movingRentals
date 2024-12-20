import { CartModel } from "../models/cart.model";

export interface ICartRepository {
    update(id: string, data: any): Promise<CartModel>;
    findById(id: string): Promise<CartModel>;
}
