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
  search?: string;
  createdByUser?: string;
  service?: string;
  isReserve?: boolean | string;
  createdAtStart?: string;
  createdAtEnd?: string;
  reservationDateStart?: string;
  reservationDateEnd?: string;
  paymentMethod?: string;
  page?: number;
  limit?: number;
}

export interface IContractRepository {
  create(contract: ContractModel, userId: string): Promise<ContractModel>;
  findById(id: string): Promise<ContractModel>;
  findAll(filters: IContractFilters): Promise<IPaginatedContractResponse>;
  findAllMinimal(filters: { search?: string; limit?: number }): Promise<Array<{
    _id: string;
    bookingNumber: number;
    email: string;
    name: string;
    lastName: string;
  }>>;
  update(id: string, contractData: any, userId: string): Promise<ContractModel>;
  createHistoryEvent(
    contractId: string,
    userId: string,
    eventType: string,
    details: string,
    metadata?: Record<string, any>
  ): Promise<ContractHistory>;
  getTimelineForContract(contractId: string): Promise<ContractHistory[]>;

  // Métodos para soft delete de movimientos
  softDeleteHistoryEntry(
    historyId: string,
    userId: string,
    reason?: string
  ): Promise<ContractHistory>;

  restoreHistoryEntry(historyId: string): Promise<ContractHistory>;

  getDeletedHistoryEntries(contractId: string): Promise<ContractHistory[]>;

  // TEMPORAL: Método para debug
  getContractWithMovementsByBookingNumber(bookingNumber: number): Promise<any>;
}
