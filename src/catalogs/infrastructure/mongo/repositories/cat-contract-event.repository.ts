import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CatContractEventModel } from '../../../domain/models/cat-contract-event.model';
import { ICatContractEventRepository } from '../../../domain/repositories/cat-contract-event.interface.repository';
import { CatContractEventSchema } from '../schemas/cat-contract-event.schema';

@Injectable()
export class CatContractEventRepository implements ICatContractEventRepository {
  constructor(
    @InjectModel('CatContractEvent') private readonly db: Model<CatContractEventSchema>,
  ) {}

  async create(model: CatContractEventModel): Promise<CatContractEventModel> {
    const doc = new this.db(model.toJSON());
    const saved = await doc.save();
    if (!saved) throw new Error("CatContractEvent shouldn't be created");
    return CatContractEventModel.hydrate(saved);
  }

  async findById(id: string): Promise<CatContractEventModel | null> {
    const found = await this.db.findById(id);
    return found ? CatContractEventModel.hydrate(found) : null;
  }

  async findAll(): Promise<CatContractEventModel[]> {
    const list = await this.db.find();
    if (!list) return [];
    return list.map((i) => CatContractEventModel.hydrate(i));
  }

  async findByName(name: string): Promise<CatContractEventModel | null> {
    const found = await this.db.findOne({ name });
    return found ? CatContractEventModel.hydrate(found) : null;
  }
}
