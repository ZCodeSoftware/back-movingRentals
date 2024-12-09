import { BranchesModel } from '../models/branches.model';

export interface IBranchesRepository {
  findById(id: string): Promise<BranchesModel>;
}
