import { CatCategoryModel } from "../models/cat-category.model";

export interface ICatCategoryRepository {
    findAll(): Promise<CatCategoryModel[]>;
    findById(id: string): Promise<CatCategoryModel>
    findByName(name: string): Promise<CatCategoryModel>
    create(catCategory: CatCategoryModel): Promise<CatCategoryModel>
    update(id: string, catCategory: CatCategoryModel): Promise<CatCategoryModel>
}