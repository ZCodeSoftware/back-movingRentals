import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BaseErrorException } from "../../../../core/domain/exceptions/base.error.exception";
import { PriceModel } from "../../../domain/models/price.model";
import { IPriceRepository } from "../../../domain/repositories/price.interface.repository";
import { PriceSchema } from "../schemas/price.schema";

@Injectable()
export class PriceRepository implements IPriceRepository {
    constructor(
        @InjectModel('Price')
        private readonly priceDB: Model<PriceSchema>,
    ) { }

    async findAll(): Promise<PriceModel[]> {
        const prices = await this.priceDB.find().populate('priceCondition');
        return prices?.map(price => PriceModel.hydrate(price));
    }

    async findById(id: string): Promise<PriceModel> {
        const price = await this.priceDB.findById(id).populate('priceCondition');
        if (!price) throw new BaseErrorException('Price not found', HttpStatus.NOT_FOUND);
        return PriceModel.hydrate(price);
    }

    async create(data: PriceModel): Promise<PriceModel> {
        const schema = new this.priceDB(data.toJSON());
        const saved = await schema.save();

        if (!saved) throw new BaseErrorException('Price not created', HttpStatus.BAD_REQUEST);

        return PriceModel.hydrate(saved);
    }
}