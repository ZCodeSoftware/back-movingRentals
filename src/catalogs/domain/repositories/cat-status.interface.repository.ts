import { CatStatusModel } from "../models/cat-status.model";

export interface ICatStatusRepository {
    findAll(): Promise<CatStatusModel[]>;
    findById(id: string): Promise<CatStatusModel>;
    findByName(name: string): Promise<CatStatusModel>;
    create(catStatus: CatStatusModel): Promise<CatStatusModel>;
}