import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BaseErrorException } from "../../../../core/domain/exceptions/base.error.exception";
import { CatCategoryModel } from "../../../domain/models/cat-category.model";
import { ICatCategoryRepository } from "../../../domain/repositories/cat-category.interface.repository";
import { CatCategorySchema } from "../schemas/category.schema";


@Injectable()
export class CatCategoryRepository implements ICatCategoryRepository {
    constructor(
        @InjectModel("CatCategory")
        private readonly catCategoryDB: Model<CatCategorySchema>,
    ) { }

    async findById(id: string): Promise<CatCategoryModel> {
        const category = await this.catCategoryDB.findById(id);
        if (!category) throw new BaseErrorException('Category not found', HttpStatus.NOT_FOUND);
        return CatCategoryModel.hydrate(category);
    }
}