import { CatRoleModel } from '../models/cat-role.model';

export interface ICatRoleRepository {
  findByName(carRoleName: string): Promise<CatRoleModel>;
  findById(id: string): Promise<CatRoleModel>;
}
