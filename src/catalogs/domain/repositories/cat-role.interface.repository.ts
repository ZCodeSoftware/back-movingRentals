import { CatRoleModel } from '../models/cat-role.model';

export interface ICatRoleRepository {
  findAll(): Promise<CatRoleModel[]>;
  findByName(carRoleName: string): Promise<CatRoleModel>;
  create(carRole: CatRoleModel): Promise<CatRoleModel>;
  delete(catRoleId: string): Promise<number>;
}
