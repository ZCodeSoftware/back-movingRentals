import { ContractModel } from "../models/contract.model";

export interface IPaginatedContractResponse {
  data: ContractModel[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface IContractFilters {
  contractNumber?: number;
  status?: string;
  reservingUser?: string;
  createdByUser?: string;
  page?: number;
  limit?: number;
}

export interface IContractRepository {
    create(contract: ContractModel, userId: string): Promise<ContractModel>;
    findById(id: string): Promise<ContractModel>;
    findAll(filters: IContractFilters): Promise<IPaginatedContractResponse>;
    update(id: string, contract: any): Promise<ContractModel>;
}
