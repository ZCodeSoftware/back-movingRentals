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
  markAsPaid(id: string): Promise<CommissionModel>;
}
