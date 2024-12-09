import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseErrorException } from '../../../../core/domain/exceptions/base.error.exception';
import { TourModel } from '../../../domain/models/tour.model';
import { ITourRepository } from '../../../domain/repositories/tour.interface.repository';
import { TourSchema } from '../schemas/tour.schema';

@Injectable()
export class TourRepository implements ITourRepository {
  constructor(
    @InjectModel('Tour') private readonly tourDB: Model<TourSchema>,
  ) {}

  async findById(id: string): Promise<TourModel> {
    const tour = await this.tourDB.findById(id).populate('category');
    if (!tour)
      throw new BaseErrorException('Tour not found', HttpStatus.NOT_FOUND);
    return TourModel.hydrate(tour);
  }
}
