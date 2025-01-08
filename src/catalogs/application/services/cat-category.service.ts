import { Inject, Injectable } from "@nestjs/common";
import { CatCategoryModel } from "../../domain/models/cat-category.model";
import { ICatCategoryRepository } from "../../domain/repositories/cat-category.interface.repository";
import { ICatCategoryService } from "../../domain/services/cat-category.interface.service";
import { ICreateCategory, IUpdateCategory } from "../../domain/types/cat-category.type";
import SymbolsCatalogs from "../../symbols-catalogs";

@Injectable()
export class CatCategoryService implements ICatCategoryService {
    constructor(
        @Inject(SymbolsCatalogs.ICatCategoryRepository)
        private readonly catCategoryRepository: ICatCategoryRepository,
    ) { }

    async findAll() {
        return this.catCategoryRepository.findAll();
    }

    async findById(id: string) {
        return this.catCategoryRepository.findById(id);
    }

    async findByName(name: string) {
        return this.catCategoryRepository.findByName(name);
    }

    async create(catCategory: ICreateCategory) {
        const categoryModel = CatCategoryModel.create(catCategory);
        return this.catCategoryRepository.create(categoryModel);
    }

    async update(id: string, catCategory: IUpdateCategory) {
        const categoryModel = CatCategoryModel.create(catCategory);
        return this.catCategoryRepository.update(id, categoryModel);
    }
}