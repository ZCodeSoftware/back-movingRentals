import { BranchesModel } from '../models/branches.model';
import { ICreateBranches } from '../types/branches.type';

export interface IBranchesService {
  create(branches: ICreateBranches): Promise<BranchesModel>;
  findById(id: string): Promise<BranchesModel>;
  findAll(): Promise<BranchesModel[]>;
}
