import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CatRoleModel } from '../../../../catalogs/domain/models/cat-role.model';
import { CatRoleSchema } from '../schemas/car-role.schema';
import { ICatRoleRepository } from '../../../../catalogs/domain/repositories/cat-role.interface.repository';

@Injectable()
export class CatRoleRepository implements ICatRoleRepository {
  constructor(
    @InjectModel('CatRole')
    private readonly catRoleModel: Model<CatRoleSchema>,
  ) {}

  async findAll(): Promise<CatRoleModel[]> {
    const roles = await this.catRoleModel.find();

    return roles.map((role) => CatRoleModel.hydrate(role));
  }

  async findByName(carRoleName: string): Promise<CatRoleModel> {
    return await this.catRoleModel.findOne({ name: carRoleName });
  }

  async create(catRole: CatRoleModel): Promise<CatRoleModel> {
    const schema = new this.catRoleModel(catRole.toJSON());

    const saved = await schema.save();

    return CatRoleModel.hydrate(saved);
  }

  async delete(catRoleId: string): Promise<number> {
    const result = await this.catRoleModel.deleteOne({ _id: catRoleId });

    return result.deletedCount ? 1 : 0;
  }
}
