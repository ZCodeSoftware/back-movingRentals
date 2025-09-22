import { CommissionModel } from '../../domain/models/commission.model';

export interface ICommissionRepository {
  create(commission: CommissionModel): Promise<CommissionModel>;
  findAllByOwner(ownerId: string, filters?: any): Promise<CommissionModel[]>;
  findByBooking(bookingId: string): Promise<CommissionModel[]>;
  markAsPaid(id: string): Promise<CommissionModel>;
}
