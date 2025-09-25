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
}
