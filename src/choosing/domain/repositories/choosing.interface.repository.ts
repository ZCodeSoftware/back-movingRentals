import { ChoosingModel } from "../models/choosing.model";

export interface IChoosingRepository {
    create(choosing: ChoosingModel): Promise<ChoosingModel>;
    findById(id: string): Promise<ChoosingModel>;
    findAll(): Promise<ChoosingModel[]>;
}
