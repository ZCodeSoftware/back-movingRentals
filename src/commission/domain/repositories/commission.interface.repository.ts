import { CommissionModel } from '../../domain/models/commission.model';

export interface ICommissionRepository {
  create(commission: CommissionModel): Promise<CommissionModel>;
  findAllByOwner(ownerId: string, filters?: any): Promise<{
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
  findByBooking(bookingId: string): Promise<CommissionModel[]>;
  findByBookingNumber(bookingNumber: number): Promise<CommissionModel[]>;
  updateByBookingNumber(bookingNumber: number, updates: Partial<CommissionModel>): Promise<CommissionModel[]>;
  markAsPaid(id: string): Promise<CommissionModel>;
  updateById(id: string, updates: Partial<{ amount: number; commissionPercentage: number }>): Promise<CommissionModel>;
  deleteById(id: string): Promise<void>;
  deleteByBookingNumberAndSource(bookingNumber: number, source: 'booking' | 'extension'): Promise<number>;
  getBookingIdByCommissionId(commissionId: string): Promise<string | null>;
  getCommissionDetailsById(commissionId: string): Promise<{ bookingId: string | null; source: string | null }>;
}
