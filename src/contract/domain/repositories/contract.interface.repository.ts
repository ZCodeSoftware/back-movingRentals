import { ContractHistory } from "../../../core/infrastructure/mongo/schemas/public/contract-history.schema";
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
  bookingNumber?: number;
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
  update(id: string, contractData: any, userId: string): Promise<ContractModel>
  createHistoryEvent(
    contractId: string,
    userId: string,
    eventType: string,
    details: string,
    metadata?: Record<string, any>
  ): Promise<ContractHistory>
}
