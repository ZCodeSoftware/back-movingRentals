import { CatCategoryModel } from "../models/cat-category.model";

export interface ICatCategoryRepository {
    findById(id: string): Promise<CatCategoryModel>
}