import { CommissionModel } from '../../domain/models/commission.model';

export interface ICommissionService {
  create(commission: Partial<CommissionModel>): Promise<CommissionModel>;
  listByOwner(ownerId: string, filters?: any): Promise<CommissionModel[]>;
  pay(id: string): Promise<CommissionModel>;
}
