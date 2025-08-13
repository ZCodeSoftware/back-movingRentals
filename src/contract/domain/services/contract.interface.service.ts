import { ContractHistory } from '../../../core/infrastructure/mongo/schemas/public/contract-history.schema';
import { ReportEventDTO } from '../../infrastructure/nest/dtos/contract.dto';
import { ContractModel } from '../models/contract.model';
import { IContractFilters, IPaginatedContractResponse } from '../repositories/contract.interface.repository';
import { ICreateContract } from '../types/contract.type';

export interface IContractService {
  create(contract: ICreateContract, userId: string): Promise<ContractModel>;
  findById(id: string): Promise<ContractModel>;
  findAll(filters: IContractFilters): Promise<IPaginatedContractResponse>;
  update(id: string, contract: Partial<ICreateContract>, userId: string): Promise<ContractModel>;
  reportEvent(contractId: string, userId: string, eventData: ReportEventDTO): Promise<ContractHistory>
}