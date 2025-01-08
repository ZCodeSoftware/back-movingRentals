import { CatModelModel } from "../models/cat-model.model";
import { ICreateModel, IUpdateModel } from "../types/cat-model.type";

export interface ICatModelService {
    findAll(): Promise<CatModelModel[]>;
    findById(id: string): Promise<CatModelModel>;
    create(model: ICreateModel): Promise<CatModelModel>;
    update(id: string, model: IUpdateModel): Promise<CatModelModel>
}