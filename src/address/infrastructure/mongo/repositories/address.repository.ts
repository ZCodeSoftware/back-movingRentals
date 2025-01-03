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

  async create(address: AddressModel): Promise<AddressModel> {
    const schema = new this.addressDB(address.toJSON());

    const newAddress = await schema.save();

    if (!newAddress)
      throw new BaseErrorException(
        `Address shouldn't be created`,
        HttpStatus.BAD_REQUEST,
      );

    return AddressModel.hydrate(newAddress);
  }

  async findById(id: string): Promise<AddressModel> {
    const address = await this.addressDB.findById(id).populate('country');
    if (!address)
      throw new BaseErrorException('Address not found', HttpStatus.NOT_FOUND);
    return AddressModel.hydrate(address);
  }

  async findAll(): Promise<AddressModel[]> {
    const addresss = await this.addressDB.find().populate('country');
    return addresss?.map((address) => AddressModel.hydrate(address));
  }
}
