import { ContractHistory } from '../../../core/infrastructure/mongo/schemas/public/contract-history.schema';
import { ReportEventDTO } from '../../infrastructure/nest/dtos/contract.dto';
import { ContractModel } from '../models/contract.model';
import { IContractFilters, IPaginatedContractResponse } from '../repositories/contract.interface.repository';
import { ICreateContract } from '../types/contract.type';

export interface IContractService {
  create(contract: ICreateContract, userId: string): Promise<ContractModel>;
  findById(id: string): Promise<ContractModel>;
  findByIdWithTotals(id: string): Promise<any>;
  findAll(filters: IContractFilters): Promise<IPaginatedContractResponse>;
  update(id: string, contract: Partial<ICreateContract>, userId: string): Promise<ContractModel>;
  reportEvent(contractId: string, userId: string, eventData: ReportEventDTO): Promise<ContractHistory>;
  getBookingTotals(contractId: string): Promise<{
    originalTotal: number;
    netTotal: number;
    adjustments: Array<{
      eventType: string;
      eventName: string;
      amount: number;
      direction: 'IN' | 'OUT';
      date: Date;
      details: string;
      paymentMethod?: string;
      paymentMedium?: string;
    }>;
  }>;

  // Métodos para gestión de movimientos
  deleteHistoryEntry(historyId: string, userId: string, reason?: string): Promise<ContractHistory>;
  restoreHistoryEntry(historyId: string): Promise<ContractHistory>;
  getDeletedHistoryEntries(contractId: string): Promise<ContractHistory[]>;

  // TEMPORAL: Método para debug
  getContractWithMovementsByBookingNumber(bookingNumber: number): Promise<any>;
}