import { CatCategoryModel } from "../models/cat-category.model";
import { ICreateCategory, IUpdateCategory } from "../types/cat-category.type";

export interface ICatCategoryService {
    findAll(): Promise<CatCategoryModel[]>;
    findById(id: string): Promise<CatCategoryModel>
    findByName(name: string): Promise<CatCategoryModel>
    create(catCategory: ICreateCategory): Promise<CatCategoryModel>
    update(id: string, catCategory: IUpdateCategory): Promise<CatCategoryModel>
}