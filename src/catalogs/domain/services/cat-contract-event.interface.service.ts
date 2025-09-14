import { CatContractEventModel } from '../models/cat-contract-event.model';
import { ICreateContractEvent } from '../types/cat-contract-event.type';

export interface ICatContractEventService {
  create(payload: ICreateContractEvent): Promise<CatContractEventModel>;
  findAll(): Promise<CatContractEventModel[]>;
  findById(id: string): Promise<CatContractEventModel>;
}
