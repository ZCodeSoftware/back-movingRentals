import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BaseErrorException } from "../../../../core/domain/exceptions/base.error.exception";
import { CartModel } from "../../../domain/models/cart.model";
import { ICartRepository } from "../../../domain/repositories/cart.interface.repository";
import { CartSchema } from "../schemas/cart.schema";

@Injectable()
export class CartRepository implements ICartRepository {
    constructor(
        @InjectModel('Cart') private readonly cartDB: Model<CartSchema>
    ) { }

    async update(id: string, data: any): Promise<CartModel> {
        const cart = await this.cartDB.findByIdAndUpdate(id, data, { new: true });

        if (!cart) throw new BaseErrorException('Cart cannot be updated', 500);

        return CartModel.hydrate(cart);
    }

    async findById(id: string): Promise<CartModel> {
        const cart = await this.cartDB.findById(id).populate('branch')
            .populate({
                path: 'transfer.transfer',
                populate: {
                    path: 'category',
                    model: 'CatCategory'
                }
            })
            .populate({
                path: 'vehicles.vehicle',
                populate: {
                    path: 'category',
                    model: 'CatCategory'
                }
            })
            .populate({
                path: 'tours.tour',
                populate: {
                    path: 'category',
                    model: 'CatCategory'
                }
            });
        if (!cart) throw new BaseErrorException('Cart not found', HttpStatus.NOT_FOUND);
        return CartModel.hydrate(cart);
    }
}
