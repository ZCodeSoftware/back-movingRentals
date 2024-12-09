import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseErrorException } from '../../../../core/domain/exceptions/base.error.exception';
import { AddressModel } from '../../../domain/models/address.model';
import { IAddressRepository } from '../../../domain/repositories/address.interface.repository';
import { AddressSchema } from '../schemas/address.schema';

@Injectable()
export class AddressRepository implements IAddressRepository {
  constructor(
    @InjectModel('Address') private readonly addressDB: Model<AddressSchema>,
  ) {}

  async findById(id: string): Promise<AddressModel> {
    const address = await this.addressDB.findById(id);
    if (!address)
      throw new BaseErrorException('Address not found', HttpStatus.NOT_FOUND);
    return AddressModel.hydrate(address);
  }
}
