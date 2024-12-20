import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseErrorException } from '../../../../core/domain/exceptions/base.error.exception';
import { BranchesModel } from '../../../domain/models/branches.model';
import { IBranchesRepository } from '../../../domain/repositories/branches.interface.repository';
import { BranchesSchema } from '../schemas/branches.schema';

@Injectable()
export class BranchesRepository implements IBranchesRepository {
  constructor(
    @InjectModel('Branches') private readonly branchesDB: Model<BranchesSchema>,
  ) { }

  async findById(id: string): Promise<BranchesModel> {
    const branches = await this.branchesDB
      .findById(id)
      .populate('address vehicles tours users');

    if (!branches)
      throw new BaseErrorException('Branches not found', HttpStatus.NOT_FOUND);

    return BranchesModel.hydrate(branches);
  }

}
