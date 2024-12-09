import { BranchesModel } from "../models/branches.model";

export interface IBranchesRepository {
    create(branches: BranchesModel): Promise<BranchesModel>;
    findById(id: string): Promise<BranchesModel>;
    findAll(): Promise<BranchesModel[]>;
}
