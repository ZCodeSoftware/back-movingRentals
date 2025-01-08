import { CatModelModel } from "../models/cat-model.model";

export interface ICatModelRepository {
    findById(id: string): Promise<CatModelModel>;
}