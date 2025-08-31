import { CatStatusModel } from '../models/cat-status.model';

export interface ICatStatusRepository {
  getStatusByName(name: string): Promise<any>;
  getStatusById(id: string): Promise<CatStatusModel | null>;
}
