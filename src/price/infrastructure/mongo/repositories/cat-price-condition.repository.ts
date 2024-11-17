import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BaseErrorException } from "../../../../core/domain/exceptions/base.error.exception";
import { CatPriceConditionModel } from "../../../domain/models/cat-price-condition.model";
import { ICatPriceConditionRepository } from "../../../domain/repositories/cat-price-condition.interface.repository";
import { CatPriceConditionSchema } from "../schemas/cat-price-condition.schema";

@Injectable()
export class CatPriceConditionRepository implements ICatPriceConditionRepository {
    constructor(
        @InjectModel('CatPriceCondition') private readonly catPriceConditionDB: Model<CatPriceConditionSchema>
    ) { }

    async findById(id: string): Promise<CatPriceConditionModel> {
        const catPriceCondition = await this.catPriceConditionDB.findById(id);
        if (!catPriceCondition) throw new BaseErrorException('CatPriceCondition not found', HttpStatus.NOT_FOUND);
        return CatPriceConditionModel.hydrate(catPriceCondition);
    }
}