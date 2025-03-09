import { ChoosingModel } from "../models/choosing.model";
import { ICreateChoosing } from "../types/choosing.type";

export interface IChoosingService {
    create(choosing: ICreateChoosing): Promise<ChoosingModel>;
    findById(id: string): Promise<ChoosingModel>;
    findAll(): Promise<ChoosingModel[]>;
}
