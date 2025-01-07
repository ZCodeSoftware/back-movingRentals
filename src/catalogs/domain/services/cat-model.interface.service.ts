import { CatModelModel } from "../models/cat-model.model";
import { ICreateModel } from "../types/cat-model.type";

export interface ICatModelService {
    findAll(): Promise<CatModelModel[]>;
    findById(id: string): Promise<CatModelModel>;
    create(model: ICreateModel): Promise<CatModelModel>;
}