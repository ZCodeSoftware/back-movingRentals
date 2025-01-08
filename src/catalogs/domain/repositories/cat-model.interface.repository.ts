import { CatModelModel } from "../models/cat-model.model";

export interface ICatModelRepository {
    findAll(): Promise<CatModelModel[]>;
    findById(id: string): Promise<CatModelModel>;
    create(catModel: CatModelModel): Promise<CatModelModel>;
    update(id: string, catModel: CatModelModel): Promise<CatModelModel>
}