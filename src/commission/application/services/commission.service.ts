import { Inject, Injectable } from '@nestjs/common';
import SymbolsCommission from '../../symbols-commission';
import { CommissionModel } from '../../domain/models/commission.model';
import { ICommissionRepository } from '../../domain/repositories/commission.interface.repository';
import { ICommissionService } from '../../domain/services/commission.interface.service';

@Injectable()
export class CommissionService implements ICommissionService {
  constructor(
    @Inject(SymbolsCommission.ICommissionRepository)
    private readonly repository: ICommissionRepository,
  ) {}

  async create(commission: Partial<CommissionModel>): Promise<CommissionModel> {
    const model = CommissionModel.create(commission);
    return this.repository.create(model);
  }

  async listByOwner(ownerId: string, filters: any = {}): Promise<CommissionModel[]> {
    return this.repository.findAllByOwner(ownerId, filters);
  }

  async pay(id: string): Promise<CommissionModel> {
    return this.repository.markAsPaid(id);
  }
}
