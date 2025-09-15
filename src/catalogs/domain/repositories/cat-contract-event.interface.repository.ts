import { CatContractEventModel } from '../models/cat-contract-event.model';

export interface ICatContractEventRepository {
  findAll(): Promise<CatContractEventModel[]>;
  findById(id: string): Promise<CatContractEventModel | null>;
  findByName(name: string): Promise<CatContractEventModel | null>;
  create(model: CatContractEventModel): Promise<CatContractEventModel>;
}
