import { AddressModel } from '../models/address.model';
import { ICreateAddress } from '../types/address.type';

export interface IAddressService {
  create(address: ICreateAddress): Promise<AddressModel>;
  findById(id: string): Promise<AddressModel>;
  findAll(): Promise<AddressModel[]>;
}
