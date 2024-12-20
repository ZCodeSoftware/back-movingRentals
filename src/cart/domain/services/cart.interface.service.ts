import { UpdateCartDTO } from "../../infrastructure/nest/dtos/cart.dto";
import { CartModel } from "../models/cart.model";

export interface ICartService {
    update(id: string, data: UpdateCartDTO): Promise<CartModel>;
    findById(id: string): Promise<CartModel>;
}
