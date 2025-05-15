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

  async create(branches: BranchesModel): Promise<BranchesModel> {
    const schema = new this.branchesDB(branches.toJSON());
    const newBranches = await schema.save();

    if (!newBranches)
      throw new BaseErrorException(
        `Branches shouldn't be created`,
        HttpStatus.BAD_REQUEST,
      );

    return BranchesModel.hydrate(newBranches);
  }

  async findById(id: string): Promise<BranchesModel> {
    const branches = await this.branchesDB
      .findById(id)
      .populate('address vehicles tours users')
      .populate({
        path: 'carousel',
        populate: {
          path: 'vehicle',
          populate: {
            path: 'category'
          }
        }
      });

    if (!branches)
      throw new BaseErrorException('Branches not found', HttpStatus.NOT_FOUND);

    return BranchesModel.hydrate(branches);
  }

  async findAll(): Promise<BranchesModel[]> {
    const branchess = await this.branchesDB
      .find()
      .populate('address vehicles tours users');

    return branchess?.map((branches) => BranchesModel.hydrate(branches));
  }

  async update(id: string, branches: BranchesModel): Promise<BranchesModel> {
    const branchesUpdated = await this.branchesDB
      .findByIdAndUpdate(id, branches.toJSON(), { new: true, omitUndefined: true })
      .populate('address vehicles tours users carousel.vehicles');

    if (!branchesUpdated)
      throw new BaseErrorException('Branches not found', HttpStatus.NOT_FOUND);

    return BranchesModel.hydrate(branchesUpdated);
  }
}
