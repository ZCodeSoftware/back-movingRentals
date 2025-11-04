import { CommissionModel } from '../../domain/models/commission.model';

export interface ICommissionService {
  create(commission: Partial<CommissionModel>): Promise<CommissionModel>;
  listByOwner(ownerId: string, filters?: any): Promise<{
    data: CommissionModel[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }>;
  pay(id: string): Promise<CommissionModel>;
  update(id: string, updates: Partial<{ amount: number; commissionPercentage: number }>): Promise<CommissionModel>;
  deleteById(id: string): Promise<void>;
  deleteByBookingNumberAndSource(bookingNumber: number, source: 'booking' | 'extension'): Promise<{ deletedCount: number }>;
}
