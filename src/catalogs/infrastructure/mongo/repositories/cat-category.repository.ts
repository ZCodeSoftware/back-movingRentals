import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BaseErrorException } from "../../../../core/domain/exceptions/base.error.exception";
import { CatCategoryModel } from "../../../domain/models/cat-category.model";
import { ICatCategoryRepository } from "../../../domain/repositories/cat-category.interface.repository";
import { CatCategorySchema } from "../schemas/cat-category.schema";

@Injectable()
export class CatCategoryRepository implements ICatCategoryRepository {
    constructor(
        @InjectModel('CatCategory')
        private readonly catCategoryDB: Model<CatCategorySchema>,
    ) { }

    async findAll(): Promise<CatCategoryModel[]> {
        const categories = await this.catCategoryDB.find();
        return categories?.map((category) => CatCategoryModel.hydrate(category));
    }

    async findById(id: string): Promise<CatCategoryModel> {
        const category = await this.catCategoryDB.findById(id);
        if (!category) throw new BaseErrorException('Category not found', HttpStatus.NOT_FOUND);
        return CatCategoryModel.hydrate(category);
    }

    async findByName(name: string): Promise<CatCategoryModel> {
        const category = await this.catCategoryDB.findOne({ name });
        if (!category) throw new BaseErrorException('Category not found', HttpStatus.NOT_FOUND);
        return CatCategoryModel.hydrate(category);
    }

    async create(catCategory: CatCategoryModel): Promise<CatCategoryModel> {
        const schema = new this.catCategoryDB(catCategory.toJSON());

        const saved = await schema.save();

        if (!saved) {
            throw new BaseErrorException(
                `Category shouldn't be created`,
                HttpStatus.BAD_REQUEST,
            );
        }

        return CatCategoryModel.hydrate(saved);
    }

    async update(id: string, catCategory: CatCategoryModel): Promise<CatCategoryModel> {
        const updateObject = catCategory.toJSON();

        const filteredUpdateObject = Object.fromEntries(
            Object.entries(updateObject).filter(([key, value]) => {
                return value !== null && value !== undefined;
            })
        );
        const updated = await this.catCategoryDB.findByIdAndUpdate(id, filteredUpdateObject, { new: true });

        if (!updated) {
            throw new BaseErrorException(
                `Category shouldn't be updated`,
                HttpStatus.BAD_REQUEST,
            );
        }

        return CatCategoryModel.hydrate(updated);
    }
}