import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CatRoleModel } from '../../../domain/models/cat-role.model';
import { ICatRoleRepository } from '../../../domain/repositories/cat-role.interface.repository';
import { CatRoleSchema } from '../schemas/car-role.schema';

@Injectable()
export class CatRoleRepository implements ICatRoleRepository {
  constructor(
    @InjectModel('CatRole')
    private readonly catRoleModel: Model<CatRoleSchema>,
  ) {}

  async findByName(carRoleName: string): Promise<CatRoleModel> {
    return await this.catRoleModel.findOne({ name: carRoleName });
  }
}
