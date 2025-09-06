import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CatStatusModel } from '../../../domain/models/cat-status.model';
import { ICatStatusRepository } from '../../../domain/repositories/cat-status.interface.repostory';
import { CatStatus } from '../schemas/cat-status.schema';

@Injectable()
export class CatStatusRepository implements ICatStatusRepository {
  constructor(
    @InjectModel('CatStatus')
    private readonly catStatusModel: Model<CatStatus>,
  ) {}

  async getStatusByName(name: string): Promise<CatStatusModel | null> {
    const status = await this.catStatusModel.findOne({ name });
    return status ? CatStatusModel.hydrate(status) : null;
  }

  async getStatusById(id: string): Promise<CatStatusModel | null> {
    const status = await this.catStatusModel.findById(id);
    return status ? CatStatusModel.hydrate(status) : null;
  }
}
