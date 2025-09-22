import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseErrorException } from '../../../../core/domain/exceptions/base.error.exception';
import { CommissionModel } from '../../../domain/models/commission.model';
import { ICommissionRepository } from '../../../domain/repositories/commission.interface.repository';
import { CommissionSchema } from '../schemas/commission.schema';

@Injectable()
export class CommissionRepository implements ICommissionRepository {
  constructor(
    @InjectModel('Commission') private readonly commissionDB: Model<CommissionSchema>,
  ) {}

  async create(commission: CommissionModel): Promise<CommissionModel> {
    const schema = new this.commissionDB(commission.toJSON());
    const saved = await schema.save();
    if (!saved) throw new BaseErrorException(`Commission shouldn't be created`, HttpStatus.BAD_REQUEST);
    return CommissionModel.hydrate(saved);
  }

  async findAllByOwner(ownerId: string, filters: any = {}): Promise<{
    data: CommissionModel[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }> {
    const query: any = {};
    if (ownerId) query.vehicleOwner = new Types.ObjectId(String(ownerId));
    if (filters.status) query.status = filters.status;

    const page = parseInt(filters.page, 10) > 0 ? parseInt(filters.page, 10) : 1;
    const limit = parseInt(filters.limit, 10) > 0 ? parseInt(filters.limit, 10) : 10;
    const skip = (page - 1) * limit;

    const totalItems = await this.commissionDB.countDocuments(query);
    const list = await this.commissionDB
      .find(query)
      .populate('user vehicleOwner vehicle booking')
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      data: list.map((doc) => CommissionModel.hydrate(doc)),
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findByBooking(bookingId: string): Promise<CommissionModel[]> {
    const list = await this.commissionDB.find({ booking: new Types.ObjectId(String(bookingId)) });
    return list.map((doc) => CommissionModel.hydrate(doc));
  }

  async markAsPaid(id: string): Promise<CommissionModel> {
    const updated = await this.commissionDB.findByIdAndUpdate(id, { status: 'PAID' }, { new: true });
    if (!updated) throw new BaseErrorException('Commission not found', HttpStatus.NOT_FOUND);
    return CommissionModel.hydrate(updated);
  }
}
