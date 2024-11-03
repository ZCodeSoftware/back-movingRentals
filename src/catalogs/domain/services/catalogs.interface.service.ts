import { CatRoleModel } from '../models/cat-role.model';
import { ICatRoleCreate } from '../types/cat-role.type';

export interface ICatRoleService {
  findAll(): Promise<CatRoleModel[]>;
  create(carRole: ICatRoleCreate): Promise<CatRoleModel>;
  delete(catRoleId: string): Promise<{ message: string }>;
}
