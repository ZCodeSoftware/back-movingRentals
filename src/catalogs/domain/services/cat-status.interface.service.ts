import { CatStatusModel } from "../models/cat-status.model";
import { ICreateStatus } from "../types/cat-status.type";

export interface ICatStatusService {
    findAll(): Promise<CatStatusModel[]>;
    findById(id: string): Promise<CatStatusModel>;
    create(catStatus: ICreateStatus): Promise<CatStatusModel>;
}