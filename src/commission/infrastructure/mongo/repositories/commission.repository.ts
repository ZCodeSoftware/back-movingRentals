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

  async findAllByOwner(ownerId: string, filters: any = {}): Promise<CommissionModel[]> {
    const query: any = { vehicleOwner: new Types.ObjectId(String(ownerId)) };
    if (filters.status) query.status = filters.status;

    const list = await this.commissionDB.find(query).populate('user vehicleOwner vehicle booking');
    return list.map((doc) => CommissionModel.hydrate(doc));
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
